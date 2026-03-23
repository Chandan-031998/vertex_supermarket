import { getReportPack, getSalesSummary } from "../services/report.service.js";

export async function salesSummary(req, res, next) {
  try {
    const data = await getSalesSummary(req.query);
    res.json({ success: true, message: "Sales summary fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function reportPack(req, res, next) {
  try {
    const data = await getReportPack(req.query);
    res.json({ success: true, message: "Reports fetched successfully", data });
  } catch (error) {
    next(error);
  }
}
