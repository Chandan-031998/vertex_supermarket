import {
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategories,
  updateCategory,
} from "../services/category.service.js";

export async function getCategories(req, res, next) {
  try {
    const data = await listCategories(req.query);
    res.json({ success: true, message: "Categories fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function getCategory(req, res, next) {
  try {
    const data = await getCategoryById(Number(req.params.id));
    res.json({ success: true, message: "Category fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function postCategory(req, res, next) {
  try {
    const data = await createCategory(req.body, req.user, req.ip);
    res.status(201).json({ success: true, message: "Category created successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function putCategory(req, res, next) {
  try {
    const data = await updateCategory(Number(req.params.id), req.body, req.user, req.ip);
    res.json({ success: true, message: "Category updated successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function removeCategory(req, res, next) {
  try {
    const data = await deleteCategory(Number(req.params.id), req.user, req.ip);
    res.json({ success: true, message: "Category deleted successfully", data });
  } catch (error) {
    next(error);
  }
}
