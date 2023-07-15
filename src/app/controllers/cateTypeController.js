const CategoryType = require("../models/categoryType.model");
const Category = require("../models/category.model");
const {
	mutipleMongooseToObject,
	mongooseToObject,
} = require("../../utils/mongoose");
const categoryHelp = require("../../utils/categoryHelp");

class cateTypeController {
	// [GET] /category?type='...'
	/**
	 * @swagger
	 * /admin/categoryType:
	 *   get:
	 *     summary: List type of category.
	 *     tags: [Admin Type of Category]
	 *     security:
	 *        - bearerAuth: []
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
	async manager(req, res, next) {
		try {
			const cateTypes = await CategoryType.find();
			// req.io.sockets.emit("testDisplay", {listCateType: cateTypes});
			res.render("adminPages/categoryType/manager", {
				cateTypes: mutipleMongooseToObject(cateTypes),
				layout: "adminLayout",
			});
		} catch (err) {
			console.error(err);
		}
	}

	// [GET] /categoryType/renderCreate
	renderCreate(req, res) {
		res.render("adminPages/categoryType/addCategoryType", {
			layout: "adminLayout",
		});
	}

	// [GET] /categoryType/renderUpdate
	renderUpdate(req, res) {
		CategoryType.findById({ _id: req.params.id })
			.then((cateType) => {
				res.render("adminPages/categoryType/categoryTypeUpdate", {
					cateType: mongooseToObject(cateType),
					labels: categoryHelp.setUpLabels(cateType.type),
					layout: "adminLayout",
				});
			})
			.catch((err) => console.log(err));
	}

	// [GET] /categoryType/getAll
	getAll(req, res) {
		CategoryType.find().then((cateTypes) => {
			cateTypes = mutipleMongooseToObject(cateTypes);
			res.send(cateTypes);
		});
	}

	/**
	 * @swagger
	 * /admin/categoryType/add:
	 *   post:
	 *     summary: Add type of category.
	 *     tags: [Admin Type of Category]
	 *     security:
	 *        - bearerAuth: []
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *                type:
	 *                  type: string
	 *                  description: Type of the category.
	 *                description:
	 *                  type: string
	 *                  description: Description type of the category.
	 *     responses:
	 *       201:
	 *         description: Created
	 *       400:
	 *         description: Error
	 */
	// [POST] /categoryType/add
	create(req, res) {
		// req.body.type = req.query.type;
		const newCategory = req.body;
		const cate = new CategoryType(newCategory);
		cate
			.save()
			.then(() => {
				res.redirect("/admin/categoryType");
			})
			.catch((err) => {
				console.log(err);
			});
	}

	// [GET] /category/update/:id
	// async update(req, res, next) {
	// 	await Category.findById({ _id: req.params.id })
	// 		.then((cate) => {
	// 			res.render("adminPages/category/categoryUpdate", {
	// 				cate: mongooseToObject(cate),
	// 				labels: categoryHelp.setUpLabels(req.query.type),
	// 				type: req.query.type,
	// 				layout: "adminLayout",
	// 			});
	// 		})
	// 		.catch((err) => console.log(err));
	// }

	/**
	 * @swagger
	 * /admin/categoryType/update/{id}:
	 *   put:
	 *     summary: Update type of category.
	 *     tags: [Admin Type of Category]
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
	 *                type:
	 *                  type: string
	 *                  description: Type of the category.
	 *                description:
	 *                  type: string
	 *                  description: Description type of the category.
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
	//[PUT] /categoryType/update/:id
	update(req, res) {
		CategoryType.updateOne({ _id: req.params.id }, req.body)
			.then(() => {
				res.redirect(`/admin/categoryType`);
				// res.status(200).send({ message: "Update successful" });
			})
			.catch((err) => {
				console.log(err);
				// res.status(400).send({ message: "Invalid input" });
			});
	}

	/**
	 * @swagger
	 * /admin/categoryType/delete/{id}:
	 *   delete:
	 *     summary: Delete type of category.
	 *     tags: [Admin Type of Category]
	 *     security:
	 *        - bearerAuth: []
	 *     parameters:
	 *        - in: path
	 *          name: id
	 *          type: string
	 *          required: true
	 *          description: categoryType ID to delete.
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
	//[DELETE] /categoryType/delete/:id
	delete(req, res) {
		CategoryType.deleteOne({ _id: req.params.id })
			.then(() => {
				Category.deleteMany({ typeId: req.params.id }).then(() => {
					res.redirect("/admin/categoryType");
				});
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
}

module.exports = new cateTypeController();
