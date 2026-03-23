import {
  createSupplier,
  deleteSupplier,
  getSupplierById,
  listSuppliers,
  updateSupplier,
} from "../services/supplier.service.js";

export async function getSuppliers(req, res, next) {
  try {
    const data = await listSuppliers(req.query);
    res.json({ success: true, message: "Suppliers fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function getSupplier(req, res, next) {
  try {
    const data = await getSupplierById(Number(req.params.id));
    res.json({ success: true, message: "Supplier fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function postSupplier(req, res, next) {
  try {
    const data = await createSupplier(req.body, req.user, req.ip);
    res.status(201).json({ success: true, message: "Supplier created successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function putSupplier(req, res, next) {
  try {
    const data = await updateSupplier(Number(req.params.id), req.body, req.user, req.ip);
    res.json({ success: true, message: "Supplier updated successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function removeSupplier(req, res, next) {
  try {
    const data = await deleteSupplier(Number(req.params.id), req.user, req.ip);
    res.json({ success: true, message: "Supplier deleted successfully", data });
  } catch (error) {
    next(error);
  }
}
