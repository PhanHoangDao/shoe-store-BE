const Promotional = require("../models/promotional.model");
const {
	mutipleMongooseToObject,
	mongooseToObject,
} = require("../../utils/mongoose");
const jwtHelp = require("../../utils/jwtHelp");

class promotionalController {
	// [GET] /promotional
	async manager(req, res, next) {
		// Can use lean() as a callback to change mongoooseList to Object
		Promotional.find()
			.then((promotes) => {
				res.render("adminPages/promotional/manager", {
					promotes: mutipleMongooseToObject(promotes),
					layout: "adminLayout",
				});
			})
			.catch((err) => {
				next(err);
			});
	}

	// [GET] /promotional/renderCreate
	renderCreate(req, res) {
		if (req.query != "warning") delete req.session.errImage;
		res.render("adminPages/promotional/promoAdd", {
			layout: "adminLayout",
		});
	}

	// [GET] /promotional/renderUpdate
	renderUpdate(req, res) {
		Promotional.findById({ _id: req.params.id })
			.then((promo) => {
				res.render("adminPages/promotional/promoUpdate", {
					promo: mongooseToObject(promo),
					layout: "adminLayout",
				});
			})
			.catch((err) => console.log(err));
	}

	// [GET] /promotional/getAll
	getAll(req, res) {
		promotional.find().then((cateTypes) => {
			cateTypes = mutipleMongooseToObject(cateTypes);
			res.send(cateTypes);
		});
	}

	// [POST] /promotional/add
	async create(req, res) {
		// req.body.type = req.query.type;
		const newPromo = req.body;
		const promo = new Promotional(newPromo);
		if (await this.isExitedPromo(promo.code)) {
			const backUrl = req.header("Referer") || "/";
			//throw error for the view...
			req.session.errText = "This promotion already existed. Please try again.";
			return res.redirect(backUrl + "?warning");
		}
		promo
			.save()
			.then(() => {
				res.redirect("/admin/promotional");
			})
			.catch((err) => {
				console.log(err);
			});
	}

	//[PUT] /promotional/saveUpdate/:id
	async update(req, res) {
		if (await this.isExitedPromo(req.body.code)) {
			const backUrl = req.header("Referer") || "/";
			//throw error for the view...
			req.session.errText = "This promotion already existed. Please try again.";
			return res.redirect(backUrl + "?warning");
		}
		Promotional.updateOne({ _id: req.params.id }, req.body)
			.then(() => {
				res.redirect(`/admin/promotional`);
			})
			.catch((err) => {
				console.log(err);
			});
	}

	//[DELETE] /promotional/delete/:id
	delete(req, res) {
		Promotional.deleteOne({ _id: req.params.id })
			.then(() => {
				res.redirect("/admin/promotional");
			})
			.catch((err) => {
				console.log(err);
			});
	}

	/**
	 * @swagger
	 * /customer/promotion:
	 *   get:
	 *     summary: List of Promotion.
	 *     tags: [Customer Service]
	 *     security:
	 *        - bearerAuth: []
	 *     responses:
	 *       200:
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                  listPromotion:
	 *                    type: array
	 *                    example: []
	 *       400:
	 *         message: Error
	 */
	async availablePromotion(req, res) {
		const userId = jwtHelp.decodeTokenGetUserId(
			req.headers.authorization.split(" ")[1]
		);
		const currentDate = new Date();
		const listPromotion = await Promotional.find({
			$and: [
				{ startDate: { $lte: currentDate } },
				{ endDate: { $gte: currentDate } },
				{ $or: [{ amount: { $gt: 0 } }, { userId: userId }] },
			],
		});
		res.status(200).send({ listPromotion });
	}

	/**
	 * @swagger
	 * /customer/applyPromo:
	 *   put:
	 *     summary: Apply promo.
	 *     tags: [Customer Service]
	 *     security:
	 *        - bearerAuth: []
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *                cartTotal:
	 *                  type: number
	 *                  description: Cart Total.
	 *                  example: 150
	 *                listPromoCode:
	 *                  type: array
	 *                  description: List Promo Code.
	 *                  example: ['EVENT', 'TEST']
	 *     responses:
	 *       200:
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                  cartTotal:
	 *                    type: number
	 *       400:
	 *         message: Error
	 */
	// apply promotional in cart
	async applyPromo(req, res) {
		try {
			const userId = jwtHelp.decodeTokenGetUserId(
				req.headers.authorization.split(" ")[1]
			);
			let totalCart = req.body.cartTotal;

			const listPromoCode = req.body.listPromoCode;

			const resultHandle = await this.handlePromo(
				listPromoCode,
				totalCart,
				"checkPromo",
				userId
			);

			if (resultHandle?.invalid) {
				return res.status(200).send({ message: resultHandle.message });
			}

			return res.status(200).send({
				totalCart: resultHandle.totalMoney,
				discount: resultHandle.totalDiscount,
			});
		} catch (err) {
			console.log(err);
			res.status(400);
		}
	}

	async handlePromo(listPromoCode, totalMoney, action, userId) {
		let promo,
			totalDiscount = 0,
			invalidPromo,
			listPromoApplied = [];

		const currentDate = new Date();

		// check duplicate promotion
		const listUniquePromoCode = new Set(listPromoCode);
		if (listUniquePromoCode.size !== listPromoCode.length) {
			return {
				invalid: true,
				message: "Duplicate promotion code. Please try again.",
			};
		}
		// TODO: Can fix return map function
		// find promo and check promo is valid
		await Promise.all(
			listPromoCode.map(async (promoCode) => {
				promo = await Promotional.findOne({
					$and: [
						{ code: promoCode },
						{ startDate: { $lte: currentDate } },
						{ endDate: { $gte: currentDate } },
						{ $or: [{ amount: { $gt: 0 } }, { userId: userId }] },
					],
				});

				// invalid promoCode
				if (!promo) {
					invalidPromo = promoCode;
					return;
				}
				totalDiscount += Number(promo.discount);
				if (action == "checkout") {
					listPromoApplied.push({ id: promo._id, amount: promo?.amount });
				}
			})
		);

		if (invalidPromo) {
			return {
				invalid: true,
				message: `Promo ${invalidPromo} is expired or out of stock. Please try again`,
			};
		}

		await Promise.all(
			listPromoApplied.map(async (promoApplied) => {
				if (promoApplied?.amount) {
					await Promotional.updateOne(
						{ _id: promoApplied.id },
						{ amount: promoApplied.amount - 1 }
					);
				} else {
					//delete promotion when use
					await Promotional.deleteOne({ _id: promoApplied.id });
				}
			})
		);

		totalMoney = totalMoney - totalDiscount;
		if (totalMoney < 0) {
			totalMoney = 0;
		}

		return { totalMoney, totalDiscount };
	}

	async promoFirstLogin(userId) {
		const newPromo = new Promotional({
			code: `NEWORDER${userId}`,
			description: "Promotion for first order",
			discount: 20,
			startDate: new Date(),
			endDate: new Date().setDate(new Date().getDate() + 15),
			userId: userId,
		});

		const promo = await newPromo.save();
		return promo.code;
	}

	async promoCheckoutSuccess(userId, orderId) {
		const newPromo = new Promotional({
			code: `NEXTORDER${orderId}`,
			description: "Promotion for next order",
			discount: 20,
			startDate: new Date(),
			endDate: new Date().setDate(new Date().getDate() + 15),
			userId: userId,
		});

		const promo = await newPromo.save();
		return promo.code;
	}

	// TODO: Check in here
	async isExitedPromo(promoCode) {
		const isExited = await Promotional.findOne({ code: promoCode });
		if (!isExited) return false;
		return true;
	}
}

module.exports = new promotionalController();
