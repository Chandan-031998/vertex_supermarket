import { getDashboardSummary } from "../services/dashboard.service.js";

export async function dashboardSummary(req, res, next) {
  try {
    const data = await getDashboardSummary();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
