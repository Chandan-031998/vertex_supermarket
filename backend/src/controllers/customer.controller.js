import {
  createCustomer,
  deleteCustomer,
  getCustomerById,
  listCustomers,
  updateCustomer,
} from "../services/customer.service.js";

export async function getCustomers(req, res, next) {
  try {
    const data = await listCustomers(req.query);
    res.json({ success: true, message: "Customers fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function getCustomer(req, res, next) {
  try {
    const data = await getCustomerById(Number(req.params.id));
    res.json({ success: true, message: "Customer fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function postCustomer(req, res, next) {
  try {
    const data = await createCustomer(req.body, req.user, req.ip);
    res.status(201).json({ success: true, message: "Customer created successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function putCustomer(req, res, next) {
  try {
    const data = await updateCustomer(Number(req.params.id), req.body, req.user, req.ip);
    res.json({ success: true, message: "Customer updated successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function removeCustomer(req, res, next) {
  try {
    const data = await deleteCustomer(Number(req.params.id), req.user, req.ip);
    res.json({ success: true, message: "Customer deleted successfully", data });
  } catch (error) {
    next(error);
  }
}
