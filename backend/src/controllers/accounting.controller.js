import { createExpense, getAccountingSummary, listExpenses } from "../services/accounting.service.js";

export async function getExpenses(req, res, next) {
  try {
    const data = await listExpenses(req.query);
    res.json({ success: true, message: "Expenses fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function postExpense(req, res, next) {
  try {
    const data = await createExpense(req.body, req.user, req.ip);
    res.status(201).json({ success: true, message: "Expense created successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function getAccountingOverview(req, res, next) {
  try {
    const data = await getAccountingSummary();
    res.json({ success: true, message: "Accounting summary fetched successfully", data });
  } catch (error) {
    next(error);
  }
}
