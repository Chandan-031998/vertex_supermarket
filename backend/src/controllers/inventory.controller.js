import {
  createInventoryAdjustment,
  getInventoryOverview,
  listExpiryAlerts,
  listInventory,
  listInventoryMovements,
  listLowStock,
} from "../services/inventory.service.js";

export async function getInventory(req, res, next) {
  try {
    const data = await listInventory(req.query);
    res.json({ success: true, message: "Inventory fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function getInventorySummary(req, res, next) {
  try {
    const data = await getInventoryOverview();
    res.json({ success: true, message: "Inventory overview fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function getLowStock(req, res, next) {
  try {
    const data = await listLowStock();
    res.json({ success: true, message: "Low stock items fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function getExpiryAlerts(req, res, next) {
  try {
    const data = await listExpiryAlerts({ days: req.query.days || 30 });
    res.json({ success: true, message: "Expiry alerts fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function getInventoryMovementHistory(req, res, next) {
  try {
    const data = await listInventoryMovements(req.query);
    res.json({ success: true, message: "Inventory movements fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function postInventoryAdjustment(req, res, next) {
  try {
    const data = await createInventoryAdjustment(req.body, req.user, req.ip);
    res.status(201).json({ success: true, message: "Inventory updated successfully", data });
  } catch (error) {
    next(error);
  }
}
