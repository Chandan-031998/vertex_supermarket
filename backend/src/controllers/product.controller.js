import {
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  searchSaleProducts,
  updateProduct,
} from "../services/product.service.js";

export async function getProducts(req, res, next) {
  try {
    const data = await listProducts(req.query);
    res.json({ success: true, message: "Products fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req, res, next) {
  try {
    const data = await getProductById(Number(req.params.id));
    res.json({ success: true, message: "Product fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function getSaleSearchProducts(req, res, next) {
  try {
    const data = await searchSaleProducts(req.query.q || "");
    res.json({ success: true, message: "POS products fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function postProduct(req, res, next) {
  try {
    const data = await createProduct(req.body, req.user, req.ip);
    res.status(201).json({ success: true, message: "Product created successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function putProduct(req, res, next) {
  try {
    const data = await updateProduct(Number(req.params.id), req.body, req.user, req.ip);
    res.json({ success: true, message: "Product updated successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function removeProduct(req, res, next) {
  try {
    const data = await deleteProduct(Number(req.params.id), req.user, req.ip);
    res.json({ success: true, message: "Product deleted successfully", data });
  } catch (error) {
    next(error);
  }
}
