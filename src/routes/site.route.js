const express = require("express");
const router = express.Router();

const Product = require("../app/controllers/shoeController");
const Category = require("../app/controllers/cateController");

//search product
router.post("/", Product.displayAllProduct);

// home
router.get("/", Product.displayAllProduct);

// display all category
router.get("/category", Category.getAllCategory);

// filter category
router.post("/category/filter", Category.filterByCategory);
module.exports = router;
