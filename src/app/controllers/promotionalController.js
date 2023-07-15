const Promotional = require("../models/promotional.model");
const Account = require("../models/account.model");
const {
	mutipleMongooseToObject,
	mongooseToObject,
} = require("../../utils/mongoose");
const jwtHelp = require("../../utils/jwtHelp");
const commonHelp = require("../../utils/commonHelp");
const PROMO_ACTIONS = require("../../constants/promoAction");

class promotionalController {
	// [GET] /promotional
	async manager(req, res, next) {
		try {
			const routerUrl = req.url;

			let promotions, account;
			if (routerUrl === "/promotionalByCustomer") {
				promotions = await Promotional.find({
					userId: { $exists: true },
				}).lean();

				await Promise.all(
					promotions.map(async (promo) => {
						promo.code = promo.code.toUpperCase();
						promo.description = commonHelp.capitalizeFirstLetter(
							promo.description
						);
						promo.startDate = commonHelp.formatDateForPromo(promo.startDate);
						promo.endDate = commonHelp.formatDateForPromo(promo.endDate);
						account = await Account.findOne({ _id: promo.userId });
						promo.userName = account.fullname;
					})
				);

				return res.render("adminPages/promotional/managerPromoByCustomer", {
					promotes: promotions,
					layout: "adminLayout",
					permission: jwtHelp.decodeTokenGetPermission(
						req.cookies.Authorization
					),
				});
			}
			promotions = await Promotional.find({ amount: { $exists: true } }).lean();

			promotions.forEach((promo) => {
				promo.code = promo.code.toUpperCase();
				promo.description = commonHelp.capitalizeFirstLetter(promo.description);
				promo.startDate = commonHelp.formatDateForPromo(promo.startDate);
				promo.endDate = commonHelp.formatDateForPromo(promo.endDate);
			});

			res.render("adminPages/promotional/manager", {
				promotes: promotions,
				layout: "adminLayout",
				permission: jwtHelp.decodeTokenGetPermission(req.cookies.Authorization),
			});
		} catch (err) {
			console.error(err);
		}
	}

	// [GET] /promotional/renderCreate
	renderCreate(req, res) {
		if (jwtHelp.decodeTokenGetPermission(req.cookies.Authorization) === 1) {
			return res.redirect("back");
		}
		if (req.query != "warning") delete req.session.errText;
		res.render("adminPages/promotional/promoAdd", {
			layout: "adminLayout",
		});
	}

	// [GET] /promotional/renderUpdate
	async renderUpdate(req, res) {
		try {
			if (jwtHelp.decodeTokenGetPermission(req.cookies.Authorization) === 1) {
				return res.redirect("back");
			}
			if (req.query != "warning") delete req.session.errText;
			const promo = await Promotional.findById({ _id: req.params.id }).lean();
			promo.code = promo.code.toUpperCase();
			promo.description = commonHelp.capitalizeFirstLetter(promo.description);
			promo.startDate = commonHelp.formatDateForPromo(promo.startDate);
			promo.endDate = commonHelp.formatDateForPromo(promo.endDate);
			promo.dateRange = promo.startDate + " - " + promo.endDate;

			res.render("adminPages/promotional/promoUpdate", {
				promo: promo,
				layout: "adminLayout",
			});
		} catch (err) {
			console.log(err);
		}
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
		try {
			if (jwtHelp.decodeTokenGetPermission(req.cookies.Authorization) === 1) {
				return res.redirect("back");
			}
			// req.body.type = req.query.type;
			const newPromo = req.body;
			const [startDate, endDate] = req.body.dateRange.split("-");
			newPromo.startDate = commonHelp.formatDateTime(startDate.trim());
			newPromo.endDate = commonHelp.formatDateTime(endDate.trim());
			const promo = new Promotional(newPromo);

			if (await this.isExitedPromo(promo.code)) {
				const backUrl = req.header("Referer") || "/";
				//throw error for the view...
				req.session.errText =
					"This promotion already existed. Please try again.";
				return res.redirect(backUrl + "?warning");
			}
			await promo.save();
			res.redirect("/admin/promotional");
		} catch (err) {
			console.log(err);
		}
	}

	//[PUT] /promotional/saveUpdate/:id
	async update(req, res) {
		if (jwtHelp.decodeTokenGetPermission(req.cookies.Authorization) === 1) {
			return res.redirect("back");
		}
		if (await this.isExitedPromo(req.body.code)) {
			const backUrl = req.header("Referer") || "/";
			//throw error for the view...
			req.session.errText = "This promotion already existed. Please try again.";
			return res.redirect(backUrl + "?warning");
		}
		const promoUpdate = req.body;
		const [startDate, endDate] = req.body.dateRange.split("-");
		promoUpdate.startDate = startDate;
		promoUpdate.endDate = endDate;

		Promotional.updateOne({ _id: req.params.id }, promoUpdate)
			.then(() => {
				res.redirect(`/admin/promotional`);
			})
			.catch((err) => {
				console.log(err);
			});
	}

	//[DELETE] /promotional/delete/:id
	delete(req, res) {
		if (jwtHelp.decodeTokenGetPermission(req.cookies.Authorization) === 1) {
			return res.redirect("back");
		}
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
		try {
			const userId = jwtHelp.decodeTokenGetUserId(
				req.headers.authorization.split(" ")[1]
			);
			const currentDate = new Date().toUTCString();
			console.log(currentDate);
			const listPromotion = await Promotional.find({
				$and: [
					{ startDate: { $lte: currentDate } },
					{ endDate: { $gte: currentDate } },
					{ $or: [{ amount: { $gt: 0 } }, { userId: userId }] },
				],
			}).lean();

			listPromotion.forEach((promotion) => {
				promotion.code = promotion.code.toUpperCase();
				promotion.description = commonHelp.capitalizeFirstLetter(
					promotion.description
				);
			});

			res.status(200).send({ listPromotion });
		} catch (err) {
			console.log(err);
			res.status(200).send(err);
		}
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
				PROMO_ACTIONS.checkPromo,
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
		// check duplicate promotion
		const listUniquePromoCode = new Set(listPromoCode);
		if (listUniquePromoCode.size !== listPromoCode.length) {
			return {
				invalid: true,
				message: "Duplicate promotion code. Please try again.",
			};
		}

		const result = await this.handlePromoUsed(listPromoCode, action, userId);

		if (result.invalid) {
			return {
				invalid: true,
				message: result.message,
			};
		}

		const totalDiscount = result.totalDiscount;
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

	async handlePromoUsed(listPromo, action, userId) {
		let promo,
			invalidPromo,
			totalDiscount = 0,
			listPromoApplied = [];

		const currentDate = new Date().toISOString();
		// TODO: Can fix return map function
		// find promo and check promo is valid
		await Promise.all(
			listPromo.map(async (promoCode) => {
				promoCode = promoCode.toLowerCase();
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
				if (action == PROMO_ACTIONS.checkoutWithPromo) {
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

		return { invalid: false, totalDiscount };
	}

	// TODO: Check in here
	async isExitedPromo(promoCode) {
		const isExited = await Promotional.findOne({ code: promoCode });
		if (!isExited) return false;
		return true;
	}
}

module.exports = new promotionalController();
