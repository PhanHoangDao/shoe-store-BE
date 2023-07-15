const _ = require("lodash");

const Category = require("../models/category.model");
const CategoryType = require("../models/categoryType.model");
const CateProduct = require("../models/cateProduct.model");
const Product = require("../models/product.model");
const {
	mutipleMongooseToObject,
	mongooseToObject,
} = require("../../utils/mongoose");
const categoryHelp = require("../../utils/categoryHelp");
const jwtHelp = require("../../utils/jwtHelp");
const commonHelp = require("../../utils/commonHelp");

class cateController {
	/**
	 * @swagger
	 * /admin/categoryByType/{typeId}:
	 *   get:
	 *     summary: List of category by type.
	 *     tags: [Admin Category]
	 *     security:
	 *        - bearerAuth: []
	 *     parameters:
	 *        - in: path
	 *          name: typeId
	 *          type: string
	 *          required: true
	 *          description: typeId of category to display.
	 *     responses:
	 *       201:
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                  _id:
	 *                    type: string
	 *                    example: 1.
	 *                  name:
	 *                    type: string
	 *                    example: Adidas's product name.
	 *                  description:
	 *                    type: string
	 *                    example: Description of category
	 *                  type:
	 *                    type: string
	 *                    example: The type of category
	 *                  slug:
	 *                    type: string
	 *                    example: The slug of category
	 *       400:
	 *         description: Get list failed
	 */
	async manager(req, res) {
		try {
			const catesByType = await Category.find({
				typeId: req.params.typeId,
			}).lean();
			const type = await CategoryType.findById(req.params.typeId);
			catesByType.forEach((cate) => {
				cate.name = commonHelp.capitalizeFirstLetter(cate.name);
			});

			res.render("adminPages/category/manager", {
				catesByType: catesByType,
				type: mongooseToObject(type),
				labels: categoryHelp.setUpLabels(type.type),
				layout: "adminLayout",
				permission: jwtHelp.decodeTokenGetPermission(req.cookies.Authorization),
			});
		} catch (err) {
			console.log(err);
			res.status(400).send("Invalid input");
		}
	}

	// [GET] /category/add
	async renderCreate(req, res, next) {
		const type = await CategoryType.findById(req.params.typeId);
		res.render("adminPages/category/addCategory", {
			type: mongooseToObject(type),
			labels: categoryHelp.setUpLabels(type.type),
			layout: "adminLayout",
		});
	}

	/**
	 * @swagger
	 * /admin/category/{typeId}/add:
	 *   post:
	 *     summary: Add category.
	 *     tags: [Admin Category]
	 *     security:
	 *        - bearerAuth: []
	 *     parameters:
	 *        - in: path
	 *          name: typeId
	 *          type: string
	 *          required: true
	 *          description: typeId of category to add.
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *                name:
	 *                  type: string
	 *                  description: Name of the category.
	 *                description:
	 *                  type: string
	 *                  description: Description of the category.
	 *     responses:
	 *       201:
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                  message:
	 *                    type: string
	 *       400:
	 *         description: Error
	 */
	async create(req, res) {
		try {
			if (req.query != "warning") delete req.session.errText;
			if (jwtHelp.decodeTokenGetPermission(req.cookies.Authorization) === 1) {
				return res.redirect("back");
			}
			const newCategory = { ...req.body, typeId: req.params.typeId };
			const cate = new Category(newCategory);
			if (await this.isExistedCate(cate.name)) {
				const backUrl = req.header("Referer") || "/";
				//throw error for the view...
				req.session.errText =
					"This category already existed. Please try again.";
				return res.redirect(backUrl + "?warning");
			}
			await cate.save();
			res.redirect(`/admin/category/${req.params.typeId}`);
		} catch (err) {
			console.log(err);
			// res.status(400).send({ message: "Invalid input" });
		}
	}

	// [GET] /category/update/:id
	async renderUpdate(req, res) {
		if (req.query != "warning") delete req.session.errText;
		const type = await CategoryType.findById(req.params.typeId);
		Category.findById({ _id: req.params.cateId })
			.then((cate) => {
				res.render("adminPages/category/categoryUpdate", {
					cate: mongooseToObject(cate),
					labels: categoryHelp.setUpLabels(type.type),
					type: mongooseToObject(type),
					layout: "adminLayout",
				});
			})
			.catch((err) => console.log(err));
	}

	/**
	 * @swagger
	 * /admin/category/update/{id}:
	 *   put:
	 *     summary: Update category.
	 *     tags: [Admin Category]
	 *     security:
	 *        - bearerAuth: []
	 *     parameters:
	 *        - in: path
	 *          name: id
	 *          type: string
	 *          required: true
	 *          description: category id to update.
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *                name:
	 *                  type: string
	 *                  description: Name of the category.
	 *                description:
	 *                  type: string
	 *                  description: Description of the category.
	 *                type:
	 *                  type: string
	 *                  description: Type of the category.
	 *     responses:
	 *       201:
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                  message:
	 *                    type: string
	 *       400:
	 *         description: Error
	 */
	//[PUT] /category/update/:id
	async update(req, res, next) {
		if (jwtHelp.decodeTokenGetPermission(req.cookies.Authorization) === 1) {
			return res.redirect("back");
		}
		if (await this.isExistedCate(req.body.name)) {
			const backUrl = req.header("Referer") || "/";
			//throw error for the view...
			req.session.errText = "This category already existed. Please try again.";
			return res.redirect(backUrl + "?warning");
		}
		Category.updateOne({ _id: req.params.cateId }, req.body)
			.then(() => {
				res.redirect(`/admin/category/${req.params.typeId}`);
			})
			.catch((err) => {
				console.log(err);
			});
	}

	/**
	 * @swagger
	 * /admin/category/delete/{id}:
	 *   delete:
	 *     summary: Delete category.
	 *     tags: [Admin Category]
	 *     security:
	 *        - bearerAuth: []
	 *     parameters:
	 *        - in: path
	 *          name: id
	 *          type: string
	 *          required: true
	 *          description: category ID to delete.
	 *     responses:
	 *       201:
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                  message:
	 *                    type: string
	 *       400:
	 *         description: Error
	 */
	//[DELETE] /category/delete/:id
	delete(req, res) {
		if (jwtHelp.decodeTokenGetPermission(req.cookies.Authorization) === 1) {
			return res.redirect("back");
		}
		Category.deleteOne({ _id: req.params.id })
			.then(() => {
				res.redirect("back");
			})
			.catch((err) => {
				console.log(err);
			});
	}

	// FIND Category
	// [GET] /category/:slug
	async findCategoryByName(req, res, next) {
		let object = {};
		// string don't have upperCase
		object.name = new RegExp(req.params.slug, "i");
		await Category.find(object)
			.then((cates) => {
				res.render("adminPages/category/manager", {
					cates: mutipleMongooseToObject(cates),
					labels: categoryHelp.setUpLabels(req.query.type),
					layout: "adminLayout",
				});
			})
			.catch((err) => {
				next(err);
			});
	}

	async getAllTypes(req, res) {
		const typeList = await CategoryType.find({});
		const result = [];
		typeList.forEach((type) => {
			result.push({ type: type.type });
		});
		return result;
	}

	// CLIENT
	/**
	 * @swagger
	 * /category:
	 *   get:
	 *     summary: List of category.
	 *     tags: [Category]
	 *     responses:
	 *       200:
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                  brand:
	 *                    type: array
	 *                    items:
	 *                    example: [{"cateId": "632c260d71e4353b5869f544", "cateName": "Adidas"}, {"cateId": "635a9662e2d2ecfc5ae46158", "cateName": "Nike"}]
	 *                  style:
	 *                    type: array
	 *                    items:
	 *                    example: [{"cateId": "632c260d71e4353b5869f544", "cateName": "Sneaker"}, {"cateId": "635a9662e2d2ecfc5ae46158", "cateName": "Dad shoes"}]
	 *       400:
	 *         description: Get list failed
	 */
	async getAllCategory(req, res) {
		try {
			const categoryList = await CategoryType.aggregate([
				{ $addFields: { cateTypeId: { $toString: "$_id" } } },
				{
					$lookup: {
						from: "categories",
						localField: "cateTypeId",
						foreignField: "typeId",
						as: "result",
					},
				},
				{
					$unwind: {
						path: "$result",
						preserveNullAndEmptyArrays: false,
					},
				},
			]);

			let result = categoryList.reduce((c, v) => {
				c[v.type] = c[v.type] || [];
				c[v.type].push({ cateId: v.result._id, cateName: v.result.name });
				return c;
			}, {});

			res.status(200).send(result);
		} catch (err) {
			console.log(err);
			res.status(400).send({ message: "Bad request" });
		}
	}

	/**
	 * @swagger
	 * /category/filter:
	 *   post:
	 *     summary: List of category.
	 *     tags: [Category]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *                arrayCateId:
	 *                  type: array
	 *                  example: ["632c260d71e4353b5869f544", "632c268271e4353b5869f559", "632c269a71e4353b5869f560", "632c302fedc8f3c521113457"]
	 *                  description: The array of categories to filter.
	 *                option:
	 *                  type: string
	 *                  example: "AND"
	 *     responses:
	 *       200:
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                  _id:
	 *                    type: string
	 *                    example: 1.
	 *                  productName:
	 *                    type: string
	 *                    example: Adidas's product name.
	 *                  price:
	 *                    type: integer
	 *                    example: 68$
	 *                  introduce:
	 *                    type: string
	 *                    example: The introduce of product
	 *                  arraySize:
	 *                    type: array
	 *                    items:
	 *                      example: [{size: 6, amount: 2}, {size: 7, amount: 3}]
	 *                  arrayImage:
	 *                    type: array
	 *                    items:
	 *                      example: [{position: 0, filename: imgName1}, {position: 1, filename: imgName2}]
	 *                  slug:
	 *                    type: string
	 *                    example: The slug of product
	 *       400:
	 *         description: Get list failed
	 */
	async filterByCategory(req, res) {
		const listCateId = req.body.arrayCateId;
		const records = await CateProduct.find({
			cateId: { $in: listCateId },
			// $or: [{ amount: { $exists: false } }, { amount: { $gt: 0 } }],
		});

		// OR Filter
		if (req.body.option === "OR") {
			let arrayProId = [];
			records.forEach((record) => {
				arrayProId.push(record.proId);
			});

			// eliminate duplicate items
			arrayProId = [...new Set(arrayProId)];

			const filterOr = await Product.find({ _id: { $in: arrayProId } });
			return res.status(200).send(filterOr);
		}

		let isExisted,
			listProId = [];

		// AND Filter Handle in here
		const groupByProId = _.groupBy(records, "proId");
		for (let proId in groupByProId) {
			isExisted = true;
			listCateId.forEach((cateId) => {
				if (!groupByProId[proId].find((proId) => proId.cateId === cateId)) {
					isExisted = false;
					return;
				}
			});

			if (isExisted) {
				listProId.push(proId);
			}
		}

		const filterAnd = await Product.find({ _id: { $in: listProId } });
		return res.status(200).send(filterAnd);
	}

	async isExistedCate(cate) {
		const isExited = await Category.findOne({ name: cate });
		if (!isExited) return false;
		return true;
	}
}

module.exports = new cateController();
