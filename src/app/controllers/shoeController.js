const _ = require("lodash");
const fs = require("fs");

const Product = require("../models/product.model");
const Order = require("../models/order.model");
const OrderDetail = require("../models/orderDetail.model");
const Category = require("../models/category.model");
const CategoryProduct = require("../models/cateProduct.model");
const CateType = require("../models/categoryType.model");
const {
	mutipleMongooseToObject,
	mongooseToObject,
} = require("../../utils/mongoose");
const categoryHelp = require("../../utils/categoryHelp");
const productHelp = require("../../utils/productHelp");
const jwtHelp = require("../../utils/jwtHelp");
const imageHelp = require("../../utils/imageHelp");
const upload = require("../middlewares/upload.mdw");
const algoliaService = require("../../services/algoliaService");
const commonHelp = require("../../utils/commonHelp");

class shoeController {
	/**
	 * @swagger
	 * /admin/product:
	 *   get:
	 *     summary: List of products.
	 *     tags: [Admin Products]
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
	// [GET] /product
	async manager(req, res) {
		let listProduct = await Product.find({}).lean();

		// format data and sync data with algolia
		listProduct = await this.formatData(listProduct);
		algoliaService.updateData(listProduct);

		const searchQuery = req.query.search || "";
		const filteredItems = listProduct.filter((item) =>
			item.name.toLowerCase().includes(searchQuery.toLowerCase())
		);

		const limit = 6;
		const page = parseInt(req.query.page) || 1;

		const totalPages = Math.ceil(filteredItems.length / limit);

		const prevPage = page > 1 ? page - 1 : null;
		const nextPage = page < totalPages ? page + 1 : null;

		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;

		const pageItems = filteredItems.slice(startIndex, endIndex);
		const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

		res.render("adminPages/product/manager", {
			shoes: pageItems,
			hasPrevPage: prevPage !== null,
			prevPage,
			pages,
			currentPage: page,
			hasNextPage: nextPage !== null,
			nextPage,
			layout: "adminLayout",
			searchQuery,
		});
	}

	// [GET] /product/add
	renderCreate(req, res) {
		if (jwtHelp.decodeTokenGetPermission(req.cookies.Authorization) === 1) {
			return res.redirect("back");
		}
		if (req.query != "warning") delete req.session.errImage;
		res.render("adminPages/product/productAdd", { layout: "adminLayout" });
	}

	/**
	 * @swagger
	 * /admin/product/add:
	 *   post:
	 *     summary: Add products.
	 *     tags: [Admin Products]
	 *     security:
	 *        - bearerAuth: []
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *                  name:
	 *                    type: string
	 *                    example: Adidas's product name.
	 *                  price:
	 *                    type: integer
	 *                    example: 68$
	 *                  introduce:
	 *                    type: string
	 *                    example: The introduce of product
	 *                  description:
	 *                    type: string
	 *                    example: The description of product
	 *                  arrayCategoryId:
	 *                    type: array
	 *                    example: [632c260d71e4353b5869f544, 632c268271e4353b5869f559]
	 *                  size:
	 *                    type: array
	 *                    example: [{cateId: 632c269a71e4353b5869f560, amount: 2}, {cateId: 632c302fedc8f3c521113457, amount: 3}]
	 *                  arrayImage:
	 *                    type: array
	 *                    example: [{position: 0, filename: imgName1}, {position: 1, filename: imgName2}]
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
	// [POST] /admin/product/create
	async create(req, res) {
		try {
			if (jwtHelp.decodeTokenGetPermission(req.cookies.Authorization) === 1) {
				return res.redirect("back");
			}
			upload("image")(req, res, async function (err) {
				if (err) {
					// url for redirect back
					const backUrl = req.header("Referer") || "/";
					//throw error for the view...
					req.session.errImage = err;
					console.log("error", err);
					return res.redirect(backUrl + "?warning");
				}
				const formData = req.body;
				formData.cateIds = formData.cateIds.filter((cate) => cate.length > 0);
				formData.listImgWithColor = JSON.parse(formData.listImgWithColor);
				formData.listDeleteImg = JSON.parse(formData.listDeleteImg);
				// delete image
				if (formData.listDeleteImg.length > 0) {
					imageHelp.deleteImages(formData.listDeleteImg);
				}

				// create data
				const product = new Product(formData);
				const newProduct = await product.save();
				await Promise.all([
					formData.cateIds.map(async (cateId) => {
						const cateProduct = new CategoryProduct({
							cateId: cateId,
							proId: newProduct._id,
						});
						await cateProduct.save();
					}),
					formData.listImgWithColor.map(async (color) => {
						const colorProduct = new CategoryProduct({
							proId: newProduct._id,
							cateId: color.colorId,
							avatar: color.avatar,
							listImgByColor: color.listImg,
							listSizeByColor: color.listSize,
						});
						await colorProduct.save();
					}),
				]);
				res.status(200).send("success");
			});
		} catch (err) {
			console.log(err);
			res.status(400);
		}
	}

	// [GET] /product/update/:id
	// optimize code in here
	async renderUpdate(req, res, next) {
		if (jwtHelp.decodeTokenGetPermission(req.cookies.Authorization) === 1) {
			return res.redirect("back");
		}
		// have err in process update image
		if (req.query != "warning") delete req.session.errImage;

		// get all Cate of product
		const listCateShoe = await CategoryProduct.find({
			proId: req.params.id,
		}).lean();

		var arrCateId = [];
		listCateShoe.forEach((cateId) => {
			arrCateId.push(cateId.cateId);
		});

		// get category of Product from listCateShoe
		const resultCate = await Category.find({
			_id: {
				$in: arrCateId,
			},
		});

		// console.log("resultCate: ", resultCate);

		// group Cate Type Id and extract cate key
		const groupByCateTypeId = _(resultCate)
			.groupBy("typeId")
			.map((cate, typeId) => {
				return {
					typeId: typeId,
					cate: _.map(cate, (cate) => {
						return cate;
					}),
				};
			})
			.value();

		// console.log("groupByCateTypeId: ", groupByCateTypeId);

		// get size of shoe
		let listColorInfo = [],
			listAnotherCate = [],
			colorCate;

		// get another cate such as style, brand, ...
		groupByCateTypeId.map((item) => {
			if (item.cate.length === 1) {
				item.cate.forEach((anotherCate) => {
					listAnotherCate.push({
						typeId: anotherCate.typeId,
						cateId: anotherCate._id.toString(),
					});
				});
			}
		});

		// get list info of color of shoe such as listSize and listImg
		listCateShoe.forEach((catePro) => {
			if (catePro?.listImgByColor || catePro.listSizeByColor) {
				colorCate = resultCate.find(
					(cate) => cate._id.toString() === catePro.cateId
				);
				if (colorCate) {
					catePro.colorName = commonHelp.capitalizeFirstLetter(colorCate.name);
				}
				listColorInfo.push(catePro);
			}
		});

		// console.log("Color", listColorInfo);

		// console.log("List Cate of Product", listAnotherCate);
		// display product need update to view...
		Product.findOne({ _id: req.params.id })
			.then((product) => {
				const result = mongooseToObject(product);
				res.render("adminPages/product/productUpdate", {
					result,
					// extract key[position] is key of object groupByCateTypeId to get name of this key(typeId)
					listAnotherCate: listAnotherCate,
					listColorInfo: listColorInfo,
					layout: "adminLayout",
				});
			})
			.catch((err) => console.log(err));
	}

	// [PUT] /product/saveUpdate/:id
	update(req, res, next) {
		if (jwtHelp.decodeTokenGetPermission(req.cookies.Authorization) === 1) {
			return res.redirect("back");
		}
		upload("image")(req, res, async function (err) {
			if (err) {
				// url for redirect back
				const backUrl = req.header("Referer") || "/";
				//throw error for the view...
				req.session.errImage = err;
				return res.redirect(backUrl + "?warning");
			}
			console.log(req.body);
			// update category for Product
			// get all Cate of product
			const cateIdsProduct = await CategoryProduct.find({
				proId: req.params.id,
			});
			var arrCateId = [];
			cateIdsProduct.forEach((cateId) => {
				arrCateId.push(cateId.cateId);
			});

			// get category of Product from CateIdsProduct
			const resultCate = await Category.find({
				_id: {
					$in: arrCateId,
				},
			});

			// group Cate Type Id and extract cate key
			const groupByCateTypeId = _(resultCate)
				.groupBy("typeId")
				.map((cate, typeId) => {
					return {
						typeId: typeId,
						cate: _.map(cate, (cate) => {
							return cate;
						}),
					};
				})
				.value();

			console.log(groupByCateTypeId);
			console.log(res.locals.listAnotherCateAdded);

			const listAnotherCateAdded = res.locals.listAnotherCateAdded;
			let arrayIdUpdate = req.body.cateIds;
			let listInfoColor = JSON.parse(req.body.listImgWithColor),
				listImgDelete = JSON.parse(req.body.listDeleteImg);

			// delete image
			if (listImgDelete.length > 0) {
				imageHelp.deleteImages(listImgDelete);
			}

			// update category for Product(update)
			await Promise.all([
				req.body.cateIds.map((idUpdate) => {
					// update new cate
					for (let typeId in listAnotherCateAdded) {
						groupByCateTypeId.forEach(async (oldCate) => {
							const existedCate =
								listAnotherCateAdded[typeId].find(
									(cate) => cate.cateId.toString() === idUpdate
								) &&
								listAnotherCateAdded[typeId].find(
									(cate) =>
										cate.cateId.toString() === oldCate.cate[0]._id.toString()
								);
							if (existedCate) {
								arrayIdUpdate = arrayIdUpdate.filter(
									(newId) => newId !== idUpdate
								);

								await CategoryProduct.findOneAndUpdate(
									{
										proId: req.params.id,
										cateId: oldCate.cate[0]._id.toString(),
									},
									{ cateId: idUpdate }
								);
							}
						});
					}
				}),

				// update or create color info for this shoe
				listInfoColor.map(async (color) => {
					await CategoryProduct.findOneAndUpdate(
						{ proId: req.params.id, cateId: color.colorId },
						{
							$set: {
								listImgByColor: color.listImg,
								listSizeByColor: color.listSize,
								avatar: color.avatar,
							},
						},
						{ upsert: true }
					);
				}),
			]);

			// add new Cate
			await Promise.all([
				arrayIdUpdate.forEach((newCate) => {
					for (let typeId in listAnotherCateAdded) {
						listAnotherCateAdded[typeId].forEach(async (cate) => {
							if (cate.cateId.toString() === newCate) {
								await CategoryProduct.findOneAndUpdate(
									{ proId: req.params.id, cateId: newCate },
									{ cateId: newCate },
									{ upsert: true }
								);
							}
						});
					}
				}),
			]);

			// get information of product and update product
			Product.findOne({ _id: req.params.id })
				.then((product) => {
					product = mongooseToObject(product);
					Product.updateOne({ _id: req.params.id }, req.body).then(() => {
						res.status(200).send("success update");
					});
				})
				.catch((err) => {
					console.log(err);
				});
		});
	}

	// [DELETE] /product/delete/:id
	async delete(req, res) {
		if (jwtHelp.decodeTokenGetPermission(req.cookies.Authorization) === 1) {
			return res.redirect("back");
		}

		const listCatePro = await CategoryProduct.find({
			proId: req.params.id,
		}).lean();

		// delete image of this shoe
		listCatePro.forEach((catePro) => {
			if (catePro.listImgByColor || catePro.listSizeByColor) {
				imageHelp.deleteImages(catePro.listImgByColor);
			}
		});

		await CategoryProduct.deleteMany({ proId: req.params.id });
		await Product.deleteOne({ _id: req.params.id });
		algoliaService.deleteData([req.params.id]);
		res.redirect("/admin/product");
	}

	// CLIENT
	/**
	 * @swagger
	 * /shoes/displayAllProducts:
	 *   get:
	 *     summary: List of products.
	 *     tags: [Products]
	 *     parameters:
	 *        - in: query
	 *          name: search
	 *          type: string
	 *          description: shoe name of the shoe to get.
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
	// display product in home
	async displayAllProduct(req, res) {
		try {
			// if have request search Product
			if (req.query.search) {
				let object = productHelp.setCondition(req.query, "search");
				let products = await Product.find(object).lean();
				products = await this.formatData(products);
				return res.status(200).send(products);
			}
			// display all product
			let listProduct = await Product.find({}).lean();

			listProduct = await this.formatData(listProduct);

			res.json(listProduct);
		} catch (err) {
			console.error(err);
			res.status(200).send(err.message);
		}
	}

	/**
	 * @swagger
	 * /shoes/{id}:
	 *   get:
	 *     summary: Details of products.
	 *     tags: [Products]
	 *     security:
	 *        - bearerAuth: []
	 *     parameters:
	 *        - in: path
	 *          name: id
	 *          type: string
	 *          required: true
	 *          description: shoe ID of the shoe to get.
	 *          example: 645611d43097195146419e7b
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
	 *         description: Get item failed
	 */
	async productDetail(req, res) {
		try {
			// case 1: Not Rate, add new comment
			const isRate = await this.isValidRate(req);

			// case 2: Rated and edit comment
			const isEdit = await this.isValidEdit(req);

			const listCatePro = await CategoryProduct.find({ proId: req.params.id });
			let listCateId = [],
				listAnotherCate = [],
				listInfoByColor = [];

			let colorName, listSize = [];
			await Promise.all(
				listCatePro.map(async (catePro) => {
					if (catePro?.listImgByColor || catePro.listSizeByColor) {
						colorName = await Category.findOne({ _id: catePro.cateId });
						listSize = [];
						catePro.listSizeByColor.forEach((size) => {
							if(size.amount > 0) {
								listSize.push(size);
							}
						});
						console.log("List Size", listSize);
						listInfoByColor.push({
							id: catePro.cateId,
							images: catePro.listImgByColor,
							sizes: listSize,
							avatar: catePro.avatar,
							colorName: commonHelp.capitalizeFirstLetter(colorName.name),
						});
					} else {
						listCateId.push(catePro.cateId);
					}
				})
			);

			const listCate = await Category.find({ _id: { $in: listCateId } });
			listCate.forEach((cate) => {
				listAnotherCate.push(cate.name);
			});

			let sizeName;
			// get size of color
			await Promise.all(
				listInfoByColor.map(async (color) => {
					await Promise.all(
						color.sizes.map(async (size) => {
							sizeName = await Category.findOne({ _id: size.sizeId });
							size.sizeName = sizeName.name;
						})
					);
				})
			);

			// sorted by size
			listInfoByColor = productHelp.sortedBySize(listInfoByColor);

			const product = await Product.findOne({ _id: req.params.id }).lean();
			product.color = listInfoByColor; // TODO: Have a bugs in here
			product.listAnotherCate = listAnotherCate;

			const resultRate = await productHelp.handleRating(
				product.commentAndRate,
				isRate?.userId
			);
			product.rateScore = resultRate.averageScore;
			product.listUserComment = resultRate.listUserComment;

			product.isCommentAndRate = isRate.isValid;
			product.isEditComment = isEdit.isValid;

			res.status(200).send(product);
		} catch (err) {
			console.error(err);
			res.status(200).send(err);
		}
	}

	/**
	 * @swagger
	 * /customer/commentAndRate/{orderId}:
	 *   post:
	 *     summary: Comment for products.
	 *     tags: [Customer Service]
	 *     security:
	 *        - bearerAuth: []
	 *     parameters:
	 *        - in: path
	 *          name: orderId
	 *          type: String
	 *          required: true
	 *          description: Order ID to rate.
	 *          example: 18
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *                listRate:
	 *                  type: array
	 *                  description: Rating for product.
	 *                  example: [{"comment": "Good shoe for running", "rating": "5", "shoeId": "645611d43097195146419e7b"}, {"comment": "Good shoe for freestyle", "rating": "5", "shoeId": "64560f4b3097195146419e23"}]
	 *     responses:
	 *       201:
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                  message:
	 *                    type: string
	 *                    example: Comment success
	 *                  status:
	 *                    type: boolean
	 *                    example: true
	 *       400:
	 *         description: Comment failed
	 */
	async commentAndRate(req, res) {
		try {
			const listRate = req.body.listRate;

			const result = await this.isValidRate(req);

			if (!result.isValid) {
				return res
					.status(200)
					.send({ message: "Your order isn't valid to rate or you rated" });
			}

			const orderDetails = await OrderDetail.find({
				orderDetailId: result.order._id,
			}).lean();

			let existComment,
				shoeIdValid = false;
			await Promise.all(
				orderDetails.map(async (orderDetail) => {
					await Promise.all(
						listRate.map(async (rate) => {
							if (rate.shoeId === orderDetail.shoeId) {
								const product = await Product.findOne({
									_id: rate.shoeId,
								});

								existComment = product.commentAndRate.find(
									(item) => item.userId === result.userId
								);
								if (existComment) {
									product.commentAndRate.forEach((item) => {
										if (item.userId === result.userId) {
											item.comment = rate.comment;
											item.rating = Number(rate.rating);
											item.date = commonHelp.formatDateNow();
										}
									});
								} else {
									product.commentAndRate.push({
										userId: result.userId,
										comment: rate.comment,
										rating: Number(rate.rating),
										date: commonHelp.formatDateNow(),
									});
								}
								shoeIdValid = true;

								let updateProduct = await Product.findOneAndUpdate(
									{ _id: rate.shoeId },
									{ commentAndRate: product.commentAndRate },
									{ new: true }
								).lean();

								updateProduct = [updateProduct];

								const resultFormat = await this.formatData(updateProduct);
								algoliaService.updateData(resultFormat);
							}
						})
					);
				})
			);

			if (!shoeIdValid) {
				return res.status(200).send({ message: "Invalid shoe Id to rate" });
			}

			await Order.updateOne({ _id: result.order._id }, { isRated: true });

			return res
				.status(200)
				.send({ message: "Comment Saved Success", status: true });
		} catch (err) {
			console.log(err);
			res.status(200).send({ message: err });
		}
	}

	/**
	 * @swagger
	 * /customer/editComment/{id}:
	 *   put:
	 *     summary: Edit Comment for products.
	 *     tags: [Customer Service]
	 *     security:
	 *        - bearerAuth: []
	 *     parameters:
	 *        - in: path
	 *          name: id
	 *          type: string
	 *          required: true
	 *          description: shoe ID to comment.
	 *          example: 645611d43097195146419e7b
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *                rating:
	 *                  type: Number
	 *                  description: Rating for product.
	 *                  example: 5
	 *                comment:
	 *                  type: String
	 *                  description: Comment for product.
	 *                  example: Good shoe for sport
	 *     responses:
	 *       201:
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                  message:
	 *                    type: string
	 *                    example: Edit Comment success
	 *                  status:
	 *                    type: boolean
	 *                    example: true
	 *       400:
	 *         description: Comment failed
	 */
	async editCommentAndRate(req, res) {
		try {
			const result = await this.isValidEdit(req);

			if (!result.isValid || !req.body.comment || !req.body.rating) {
				return res.status(200).send({ message: "Invalid to edit comment." });
			}

			result.product.commentAndRate.forEach((rate) => {
				if (rate.userId === result.userId) {
					rate.comment = req.body.comment;
					rate.rating = Number(req.body.rating);
					rate.date = commonHelp.formatDateNow();
				}
			});

			await Product.updateOne(
				{ _id: req.params.id },
				{ commentAndRate: result.product.commentAndRate }
			);

			res.status(200).send({ message: "Comment updated.", status: true });
		} catch (err) {
			console.log(err);
			res.status(200).send(err);
		}
	}

	/**
	 * @swagger
	 * /customer/getRate/{id}:
	 *   get:
	 *     summary: Get Rate for products.
	 *     tags: [Customer Service]
	 *     security:
	 *        - bearerAuth: []
	 *     parameters:
	 *        - in: path
	 *          name: id
	 *          type: string
	 *          required: true
	 *          description: shoe ID to get.
	 *          example: 645611d43097195146419e7b
	 *     responses:
	 *       201:
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                  rate:
	 *                    type: number
	 *                    example: 5
	 *                  comment:
	 *                    type: string
	 *                    example: Comment of product
	 *       400:
	 *         description: failed
	 */
	async getRate(req, res) {
		try {
			const result = await this.isValidEdit(req);

			if (!result.isValid) {
				return res.status(200).send({ message: "Empty comment" });
			}

			res.status(200).send(result.existComment);
		} catch (err) {
			console.log(err);
			res.status(200).send({ message: "Invalid Input" });
		}
	}

	// display product in shoe By Gender
	displayShoeByGender(req, res) {
		// if have query search in another page throw it to shoeByGender
		if (req.query.search) {
			let object = productHelp.setCondition(req.body, "search");
			Product.find(object)
				.then((shoes) => {
					shoes = mutipleMongooseToObject(shoes);
					res.render("shoeByGender", { shoes });
				})
				.catch((err) => console.log(err));
		}
		// if have request filter product
		else if (req.body.brand || req.body.style) {
			let object = productHelp.setCondition(req.body, "filter");
			Product.find({ $and: [object] })
				.then((shoes) => {
					shoes = mutipleMongooseToObject(shoes);
					res.json({ msg: "success", data: shoes });
				})
				.catch((err) => console.log(err));
		}
		// display all product in shoes by gender
		else {
			Product.find({}).then((shoes) => {
				shoes = mutipleMongooseToObject(shoes);
				res.render("shoeByGender", { shoes });
			});
		}
	}

	// format data product for sync and display
	async formatData(listProduct) {
		await Promise.all(
			listProduct.map(async (product) => {
				// objectID for algolia
				product.objectID = product._id;

				// rating score
				const totalScore = product?.commentAndRate?.reduce(
					(sum, { rating }) => sum + rating,
					0
				);
				product.rateScore =
					Number(totalScore) / Number(product?.commentAndRate?.length) || 0;

				let listCateId = [],
					listCatePro = [],
					maxPrice = 100000,
					flag = 0;

				listCatePro = await CategoryProduct.find({ proId: product._id });
				listCatePro.forEach((catePro) => {
					if (catePro.listImgByColor || catePro.listSizeByColor) {
						if (flag == 0) {
							product.avatar = catePro.avatar;
							flag = 1;
						}
						catePro.listSizeByColor.forEach((size) => {
							if (size.amount > 0 && size.price > 0) {
								if (size.price < maxPrice) {
									maxPrice = size.price;
								}
								listCateId.push(size.sizeId);
							}
						});
					}
					listCateId.push(catePro.cateId);
				});

				product.price = Number(maxPrice);

				// eliminate size id duplicate
				listCateId = [...new Set(listCateId)];

				const listCate = await Category.find({ _id: { $in: listCateId } });
				const groupByTypeId = _.groupBy(listCate, "typeId");
				for (let typeId in groupByTypeId) {
					const typeName = await CateType.findOne({ _id: typeId });

					groupByTypeId[typeId].forEach((cate) => {
						product[typeName.type] = product[typeName.type] || [];
						product[typeName.type].push(commonHelp.capitalizeFirstLetter(cate.name));
					});
				}
			})
		);

		return listProduct;
	}

	async isValidRate(req) {
		// check user checkout and complete order
		const userId = jwtHelp.decodeTokenGetUserId(
			req?.headers?.authorization?.split(" ")[1]
		);

		let order,
			isEditComment = false;
		if (req.params.orderId) {
			order = await Order.findOne({
				customerId: userId,
				status: 3,
				_id: Number(req.params.orderId),
			});
		}

		// product detail check permission add comment
		if (req.params.id) {
			const orders = await Order.find({
				customerId: userId,
				status: 3,
			});

			await Promise.all(
				orders.map(async (item) => {
					const orderDetails = await OrderDetail.find({
						orderDetailId: item._id,
					}).lean();

					if (orderDetails.find((detail) => detail.shoeId === req.params.id)) {
						isEditComment = true;
					}
				})
			);
		}

		if (isEditComment) {
			return { isValid: true, userId };
		}

		if (userId && order) {
			return { order, userId, isValid: true };
		}

		return { isValid: false };
	}

	async isValidEdit(req) {
		const userId = jwtHelp.decodeTokenGetUserId(
			req?.headers?.authorization?.split(" ")[1]
		);

		const product = await Product.findOne({ _id: req.params.id });

		const existComment = product?.commentAndRate.find(
			(rate) => rate.userId === userId
		);

		if (existComment) {
			return { isValid: true, product, userId: userId, existComment };
		}

		return { isValid: false };
	}
}

module.exports = new shoeController();
