import {
  createBrand,
  deleteBrand,
  getBrandById,
  listBrands,
  updateBrand,
} from "../services/brand.service.js";

export async function getBrands(req, res, next) {
  try {
    const data = await listBrands(req.query);
    res.json({ success: true, message: "Brands fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function getBrand(req, res, next) {
  try {
    const data = await getBrandById(Number(req.params.id));
    res.json({ success: true, message: "Brand fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function postBrand(req, res, next) {
  try {
    const data = await createBrand(req.body, req.user, req.ip);
    res.status(201).json({ success: true, message: "Brand created successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function putBrand(req, res, next) {
  try {
    const data = await updateBrand(Number(req.params.id), req.body, req.user, req.ip);
    res.json({ success: true, message: "Brand updated successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function removeBrand(req, res, next) {
  try {
    const data = await deleteBrand(Number(req.params.id), req.user, req.ip);
    res.json({ success: true, message: "Brand deleted successfully", data });
  } catch (error) {
    next(error);
  }
}
