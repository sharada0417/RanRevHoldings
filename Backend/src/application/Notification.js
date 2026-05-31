// backend/application/notification.js

import Customer from "../infastructure/schemas/customer.js";
import Broker from "../infastructure/schemas/broker.js";
import Investment from "../infastructure/schemas/investement.js";

const safeNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

/**
 * Count completed calendar-month cycles since startDate.
 * A cycle is completed when its due date < now.
 */
const completedCycles = (startDate, now = new Date()) => {
  if (!startDate) return 0;
  const s = new Date(startDate);
  if (Number.isNaN(s.getTime())) return 0;

  let count = 0;
  const due = new Date(s);
  due.setMonth(due.getMonth() + 1);

  while (due < now) {
    count++;
    due.setMonth(due.getMonth() + 1);
  }

  return count;
};

/**
 * Get the Nth due date after startDate.
 * (The date when cycle N+1 becomes due.)
 */
const getNthDueDate = (startDate, n) => {
  const s = new Date(startDate);
  const d = new Date(s);
  d.setMonth(d.getMonth() + n);
  return d;
};

/**
 * Full investment calculation.
 * Returns arrears info, due dates, etc.
 */
const calcInvestment = (inv, now = new Date()) => {
  const principal = safeNum(inv.investmentAmount);
  const totalRate = safeNum(inv.investmentInterestRate);
  const brokerRate = safeNum(inv.brokerCommissionRate);
  const ownerRate = totalRate - brokerRate;

  const monthlyTotalInterest = (principal * totalRate) / 100;
  const monthlyBrokerCommission = (principal * brokerRate) / 100;
  const monthlyOwnerInterest = (principal * ownerRate) / 100;

  const cycles = completedCycles(inv.startDate, now);
  const totalDueInterest = monthlyTotalInterest * cycles;
  const interestPaid = safeNum(inv.interestPaidAmount);
  const arrearsInterest = Math.max(totalDueInterest - interestPaid, 0);

  const principalPaid = safeNum(inv.principalPaidAmount);
  const principalPending =
    inv.remainingPendingAmount === null || inv.remainingPendingAmount === undefined
      ? Math.max(principal - principalPaid, 0)
      : Math.max(safeNum(inv.remainingPendingAmount), 0);

  const arrearsMonthsCount =
    arrearsInterest > 0 && monthlyTotalInterest > 0
      ? Math.ceil(arrearsInterest / monthlyTotalInterest)
      : 0;

  // The first unpaid due date (= when the first arrears started)
  // If arrearsMonthsCount = 2, the first missed due is cycles - arrearsMonthsCount + 1 cycle
  const firstMissedCycleNumber = cycles - arrearsMonthsCount + 1;
  const arrearsStartDate =
    arrearsMonthsCount > 0
      ? getNthDueDate(inv.startDate, firstMissedCycleNumber)
      : null;

  // Next due date (upcoming)
  const nextDueDate = getNthDueDate(inv.startDate, cycles + 1);

  // Today's due date (today's cycle due, if exactly today)
  const todayDueDate = getNthDueDate(inv.startDate, cycles);

  let status = "ongoing";
  if (principalPending <= 0 && arrearsInterest <= 0) status = "complete";
  else if (arrearsInterest > 0) status = "arrears";
  else status = "ongoing";

  return {
    principal,
    totalRate,
    brokerRate,
    ownerRate,
    monthlyTotalInterest: Number(monthlyTotalInterest.toFixed(2)),
    monthlyBrokerCommission: Number(monthlyBrokerCommission.toFixed(2)),
    monthlyOwnerInterest: Number(monthlyOwnerInterest.toFixed(2)),
    cycles,
    totalDueInterest: Number(totalDueInterest.toFixed(2)),
    interestPaid: Number(interestPaid.toFixed(2)),
    arrearsInterest: Number(arrearsInterest.toFixed(2)),
    arrearsMonthsCount,
    arrearsStartDate,
    nextDueDate,
    todayDueDate,
    principalPending: Number(principalPending.toFixed(2)),
    status,
  };
};

/**
 * Check if a date is "today" (same calendar date in local time).
 */
const isToday = (date, now = new Date()) => {
  if (!date) return false;
  const d = new Date(date);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

/**
 * GET /api/notifications
 * Returns:
 *   previousArrears: customers with arrears from BEFORE today
 *   todayArrears:    customers whose payment is due today (first-time TODAY expiry, or both)
 *
 * A customer can appear in BOTH if they have existing arrears AND today is also a new due date.
 * Frontend shows a warning badge in that case.
 */
export const getNotifications = async (req, res) => {
  try {
    const now = new Date();

    // Get all investments with customer + broker populated
    const investments = await Investment.find()
      .populate("customerId", "nic name address city tpNumber")
      .populate("brokerId", "nic name address city tpNumber")
      .sort({ createdAt: -1 })
      .lean();

    // Group by customer
    const customerMap = new Map();

    for (const inv of investments) {
      const customer = inv.customerId;
      if (!customer) continue;

      const cKey = String(customer._id);
      if (!customerMap.has(cKey)) {
        customerMap.set(cKey, {
          customer,
          investments: [],
        });
      }
      customerMap.get(cKey).investments.push(inv);
    }

    const previousArrears = [];
    const todayArrears = [];

    for (const [, entry] of customerMap) {
      const { customer, investments: invs } = entry;

      let totalArrearsInterest = 0;
      let totalArrearsMonths = 0;
      let earliestArrearsDate = null;
      let hasTodayDue = false;
      let hasPreviousArrears = false;
      const arrearsInvestments = [];

      for (const inv of invs) {
        const calc = calcInvestment(inv, now);
        if (calc.status === "complete") continue;

        totalArrearsInterest += calc.arrearsInterest;
        totalArrearsMonths += calc.arrearsMonthsCount;

        // Track earliest arrears start date
        if (calc.arrearsInterest > 0 && calc.arrearsStartDate) {
          if (!earliestArrearsDate || calc.arrearsStartDate < earliestArrearsDate) {
            earliestArrearsDate = calc.arrearsStartDate;
          }
          hasPreviousArrears = true;
        }

        // Check if today is a due date for this investment
        if (isToday(calc.todayDueDate, now) || isToday(calc.nextDueDate, now)) {
          hasTodayDue = true;
        }

        if (calc.arrearsInterest > 0 || isToday(calc.todayDueDate, now) || isToday(calc.nextDueDate, now)) {
          arrearsInvestments.push({
            _id: inv._id,
            investmentName: inv.investmentName,
            investmentAmount: calc.principal,
            investmentInterestRate: calc.totalRate,
            brokerCommissionRate: calc.brokerRate,
            ownerInterestRate: calc.ownerRate,
            monthlyTotalInterest: calc.monthlyTotalInterest,
            monthlyBrokerCommission: calc.monthlyBrokerCommission,
            monthlyOwnerInterest: calc.monthlyOwnerInterest,
            startDate: inv.startDate,
            cycles: calc.cycles,
            totalDueInterest: calc.totalDueInterest,
            interestPaid: calc.interestPaid,
            arrearsInterest: calc.arrearsInterest,
            arrearsMonthsCount: calc.arrearsMonthsCount,
            arrearsStartDate: calc.arrearsStartDate,
            nextDueDate: calc.nextDueDate,
            todayDueDate: calc.todayDueDate,
            principalPending: calc.principalPending,
            status: calc.status,
            broker: inv.brokerId
              ? {
                  _id: inv.brokerId._id,
                  name: inv.brokerId.name,
                  nic: inv.brokerId.nic,
                  address: inv.brokerId.address,
                  city: inv.brokerId.city,
                  tpNumber: inv.brokerId.tpNumber,
                }
              : null,
          });
        }
      }

      const entry_data = {
        customerId: customer._id,
        customer: {
          _id: customer._id,
          name: customer.name,
          nic: customer.nic,
          address: customer.address,
          city: customer.city,
          tpNumber: customer.tpNumber,
        },
        totalArrearsInterest: Number(totalArrearsInterest.toFixed(2)),
        totalArrearsMonths,
        earliestArrearsDate,
        hasTodayDue,
        hasPreviousArrears,
        arrearsInvestments,
        // flag: customer has BOTH previous arrears AND today's due
        isAlsoTodayDue: hasPreviousArrears && hasTodayDue,
      };

      if (hasPreviousArrears) {
        previousArrears.push(entry_data);
      }

      if (hasTodayDue) {
        todayArrears.push(entry_data);
      }
    }

    // Sort previous arrears by earliest arrears date (oldest first)
    previousArrears.sort((a, b) => {
      if (!a.earliestArrearsDate) return 1;
      if (!b.earliestArrearsDate) return -1;
      return new Date(a.earliestArrearsDate) - new Date(b.earliestArrearsDate);
    });

    return res.status(200).json({
      success: true,
      counts: {
        previousArrears: previousArrears.length,
        todayArrears: todayArrears.length,
      },
      previousArrears,
      todayArrears,
    });
  } catch (err) {
    console.error("getNotifications error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};