const mongoose = require("mongoose");
const _ = require("lodash");
const Order = require("../models/order.model");
const OrderDetail = require("../models/orderDetail.model");
const Account = require("../models/account.model");
const Product = require("../models/product.model");
const Category = require("../models/category.model");
const CatePro = require("../models/cateProduct.model");
const CateType = require("../models/categoryType.model");
const cartHelp = require("../../utils/cartHelp");
const jwtHelp = require("../../utils/jwtHelp");
const {
	mutipleMongooseToObject,
	mongooseToObject,
} = require("../../utils/mongoose");
const mailService = require("../../services/mailService");
const paypalService = require("../../services/paypalService");
const orderHelp = require("../../utils/orderHelp");
const promoController = require("../controllers/promotionalController");
const shoeController = require("../controllers/shoeController");
const jwt = require("jsonwebtoken");
const { Mongoose } = require("mongoose");
const commonHelp = require("../../utils/commonHelp");
const promotionalController = require("../controllers/promotionalController");
const PAYMENT_METHOD = require("../../constants/paymentMethod");
const PROMO_ACTIONS = require("../../constants/promoAction");
const URL_REDIRECTS = require("../../constants/urlRedirect");

class order {
	// [GET] /order
	manager(req, res) {
		orderHelp.getOrderByStatus(3, res);
	}

	// [GET] /dashboard
	async businessStatic(req, res) {
		try {
			const { startDate, endDate, dateRange } = orderHelp.getDateRage(req);

			const [orders, orderDetails, newUsers, totalUser] = await Promise.all([
				Order.find({
					$and: [
						{ createdAt: { $gte: startDate } },
						{ createdAt: { $lte: endDate } },
					],
				}).lean(),
				OrderDetail.find({
					$and: [
						{ createdAt: { $gte: startDate } },
						{ createdAt: { $lte: endDate } },
					],
				}).lean(),
				Account.find({
					$and: [
						{ createdAt: { $gte: startDate } },
						{ createdAt: { $lte: endDate } },
					],
				}).lean(),
				Account.find({ permission: 2 }).lean(),
			]);

			// order status statistic
			let orderNotConfirm = 0,
				orderConfirmed = 0,
				orderInTransit = 0,
				orderCompleted = 0;

			orders.forEach((order) => {
				switch (order.status) {
					case 0:
						orderNotConfirm++;
						break;
					case 1:
						orderConfirmed++;
						break;
					case 2:
						orderInTransit++;
						break;
					default:
						orderCompleted++;
						break;
				}
			});

			// group by shoeId
			const groupByShoeId = _(orderDetails).groupBy("shoeId").value();

			let listSummary = [],
				remainingAmount,
				listCateId,
				brandOfShoe,
				listInfoByColor,
				colorBestSeller,
				sizeBestSeller,
				calcBestSeller,
				typeOfCate;

			for (let shoeId in groupByShoeId) {
				remainingAmount = 0;
				listCateId = [];
				brandOfShoe = "";
				(calcBestSeller = {}), (listInfoByColor = []), (typeOfCate = {});

				// find catePro of shoe with shoeId
				const listCatePro = await CatePro.find({
					proId: shoeId,
				});

				// split catePro with color and catePro with another cate
				listCatePro.forEach((catePro) => {
					if (catePro?.listImgByColor || catePro?.listSizeByColor) {
						listInfoByColor.push({
							id: catePro.cateId,
							images: catePro.listImgByColor,
							sizes: catePro.listSizeByColor,
							avatar: catePro.avatar,
						});
						// get remaining amount
						catePro.listSizeByColor.forEach((size) => {
							remainingAmount += Number(size.amount);
						});
					} else {
						// list to get Brand of shoe
						listCateId.push(catePro.cateId);
					}
				});

				calcBestSeller = groupByShoeId[shoeId].reduce(
					(acc, item) => {
						// calculate sale amount
						acc.saleAmount += Number(item.quantity);
						// get sizeId and colorId best seller
						if (item.quantity > acc.maxQuantity) {
							acc.maxQuantity = item.quantity;
							acc.colorIdWithMaxQuantity = item.colorId;
							acc.sizeIdWithMaxQuantity = item.sizeId;
						}
						return acc;
					},
					{
						maxQuantity: 0,
						colorIdWithMaxQuantity: "",
						sizeIdWithMaxQuantity: "",
						saleAmount: 0,
					}
				);

				// get Info of color and size best seller
				colorBestSeller = listInfoByColor.find(
					(info) => info.id === calcBestSeller.colorIdWithMaxQuantity
				);

				// if info of product is not available
				if (!colorBestSeller) {
					continue;
				}
				sizeBestSeller = colorBestSeller?.sizes?.find(
					(size) => size.sizeId === calcBestSeller.sizeIdWithMaxQuantity
				);

				const [listCate, product, colorInfo, sizeInfo] = await Promise.all([
					Category.find({
						_id: { $in: listCateId },
					}).lean(),
					Product.findOne({ _id: shoeId }),
					Category.findOne({ _id: colorBestSeller?.id }),
					Category.findOne({ _id: sizeBestSeller?.sizeId }),
				]);

				await Promise.all(
					listCate.map(async (cate) => {
						typeOfCate = await CateType.findOne({ _id: cate.typeId }).lean();
						if (typeOfCate.type === "brand") {
							brandOfShoe = cate.name;
						}
					})
				);

				listSummary.push({
					shoeId: product?._id,
					name: product?.name,
					brand: brandOfShoe,
					sale: calcBestSeller.saleAmount,
					amountRemaining: remainingAmount,
					colorBestSeller: colorInfo?.name,
					sizeBestSeller: sizeInfo?.name,
				});
			}

			listSummary = _.orderBy(listSummary, ["sale"], ["desc"]);

			res.render("adminPages/index", {
				orderNotConfirm,
				orderConfirmed,
				orderInTransit,
				orderCompleted,
				newUsers: newUsers.length,
				totalUser: totalUser.length,
				dateRange: dateRange,
				listSummary,
				layout: "adminLayout",
			});
		} catch (err) {
			console.log(err);
		}
	}

	// [GET] /orderNotConfirm
	orderNotConfirm(req, res) {
		orderHelp.getOrderByStatus(0, res);
	}

	// [GET] /orderInTransit
	orderInTransit(req, res) {
		orderHelp.getOrderByStatus(2, res);
	}

	// [GET] /orderConfirmed
	orderConfirmed(req, res) {
		orderHelp.getOrderByStatus(1, res);
	}

	// [GET] /order/orderDetails/:id
	async viewOrderDetails(req, res) {
		try {
			let orderDetails = await OrderDetail.find({
				orderDetailId: req.params.id,
			});
			orderDetails = mutipleMongooseToObject(orderDetails);

			// get info of product
			const results = [];
			await Promise.all(
				orderDetails.map(async (orderDetail) => {
					const { shoeInfo, infoBySizeId, size } = await cartHelp.getShoeInfo(
						orderDetail.shoeId,
						orderDetail.colorId,
						orderDetail.sizeId
					);
					const product = await Product.findOne({ _id: orderDetail.shoeId });

					orderDetail.image = shoeInfo.avatar;
					orderDetail.productName = product.name;
					orderDetail.productPrice = infoBySizeId.price;
					orderDetail.sizeName = size.name;

					results.push(orderDetail);
				})
			);
			res.render("adminPages/order/orderDetails", {
				orderDetails: results,
				layout: "adminLayout",
			});
		} catch (error) {
			console.log(error);
		}
	}

	//[GET] /order/orderUpdate/:id
	orderUpdate(req, res) {
		if (req.query != "warning") delete req.session.errText;
		OrderDetail.find({ orderDetailId: req.params.id }).then((orderDetails) => {
			orderDetails = mutipleMongooseToObject(orderDetails);
			res.render("adminPages/order/orderUpdate", {
				orderDetails,
				orderId: req.params.id,
				layout: "adminLayout",
			});
		});
	}

	//[PUT] order/saveUpdate/:id
	async saveUpdate(req, res) {
		var listForUpdate = orderHelp.trimArray(req.query.updateSubOrder);
		var listForAdd = orderHelp.trimArray(req.query.newSubOrder);
		var listForDelete = orderHelp.trimArray(req.query.deleteSubOrder);

		// update sub order
		var listSubOrder = orderHelp.formatOrder(
			req.body.shoeId,
			req.body.size,
			req.body.quantity,
			req.body.price
		);
		console.log(
			"🚀 ~ file: orderController.js ~ line 75 ~ order ~ saveUpdate ~ listSubOrder",
			listSubOrder
		);

		// subOrder Update
		await orderHelp.handleSubOrderUpdate(listForUpdate, listSubOrder);

		// new subOrder
		await orderHelp.handleNewSubOrder(listForAdd, listSubOrder, req.params.id);

		// subOrder Delete
		await orderHelp.handleSubOrderDelete(listForDelete);
		// setTotal
		await orderHelp.setTotalForOrderUpdate(req.params.id);
	}

	//[PUT] /order/changeStatus
	async changeOrderStatus(req, res) {
		let flag = 0,
			messageErr;
		// order be confirmed
		if (req.params.currentStatus == 0) {
			const orders = await OrderDetail.find({ orderDetailId: req.params.id });
			await Promise.all(
				orders.map(async (order) => {
					const handle = await orderHelp.decreaseAmountProduct(order);
					if (handle?.isError) {
						flag = 1;
						messageErr = handle?.message;
					}
				})
			);
		}
		if (flag == 1) {
			return await orderHelp.getOrderByStatus(0, res, messageErr);
		}
		Order.updateOne(
			{ _id: req.params.id },
			{ $set: { status: Number(req.params.currentStatus) + 1 } }
		).then(() => {
			if (Number(req.params.currentStatus) + 1 == 1) {
				res.redirect("/admin/orderConfirmed");
			} else if (Number(req.params.currentStatus) + 1 == 2) {
				res.redirect("/admin/orderInTransit");
			} else if (Number(req.params.currentStatus) + 1 == 3) {
				res.redirect("/admin/order");
			} else {
				res.redirect("/admin/orderNotConfirm");
			}
		});
	}

	// [PUT] /order/revertStatus
	async revertOrderStatus(req, res) {
		// if order is confirmed, can't revert status, check again ???
		// if have gonna increaseAmountProduct from amount of order.

		// start to revert status
		Order.updateOne(
			{ _id: req.params.id },
			{ $set: { status: Number(req.params.currentStatus) - 1 } }
		).then(() => {
			if (Number(req.params.currentStatus) - 1 == 1) {
				res.redirect("/admin/orderConfirmed");
			} else if (Number(req.params.currentStatus) - 1 == 2) {
				res.redirect("/admin/orderInTransit");
			} else {
				res.redirect("/admin/order");
			}
		});
	}

	//[GET] /order/add
	async create(req, res) {
		if (req.query != "warning") delete req.session.errText;
		res.render("adminPages/order/orderAdd", {
			layout: "adminLayout",
		});
	}

	//[POST] /order/save
	async saveCreate(req, res) {
		try{
			let order = {
				customerId: req.body.customerId,
				total: orderHelp.setTotalForNewOrder(req.body.price, req.body.quantity),
				status: 1,
				isRate: false,
				paymentMethod: req.body.payment,
			};
			let listOrderDetails = orderHelp.formatOrder(
				req.body.shoeId,
				req.body.size,
				req.body.quantity,
				req.body.price,
				req.body.color
			);
			const nextOrderId = await orderHelp.getOrderId(); // orderId
			let flag = 0, messageErr;
			await Promise.all(
				listOrderDetails.map(async (item) => {
					const handle = await orderHelp.decreaseAmountProduct(item);
					if(handle?.isError) {
						flag = 1;
						messageErr = handle?.message;
					}
					item.orderDetailId = nextOrderId;
					const newOrderDetail = new OrderDetail(item);
					await newOrderDetail.save();
				})
			);
			if(flag === 1) {
				// url for redirect back
				const backUrl = req.header("Referer") || "/";
				//throw error for the view...
				req.session.errText = messageErr;
				return res.redirect(backUrl + "?warning");
			}

			const newOrder = new Order(order);
			newOrder
				.save()
				.then(() => {
					res.redirect("/admin/orderConfirmed");
				})
				.catch((err) => console.log(err));
		}
		catch(err) {
			console.log(err);
		}
	}

	/**
	 * @swagger
	 * /customer/checkout:
	 *   post:
	 *     summary: Checkout cart.
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
	 *                  fullname:
	 *                    type: string
	 *                    example: storage Byme.
	 *                  address:
	 *                    type: string
	 *                    example: Ho Chi Minh City
	 *                  numberPhone:
	 *                    type: string
	 *                    example: 0924714552
	 *                  email:
	 *                    type: string
	 *                    example: storage1520@gmail.com
	 *                  listPromoCode:
	 *                    type: array
	 *                    example: ['EVENT', 'NEWORDER']
	 *     responses:
	 *       201:
	 *         description: Checkout success
	 *       400:
	 *         description: Get list failed
	 */
	async checkout(req, res) {
		try {
			const { userAccount, carts } = await this.updateInfoAndGetCart(req);
			if (!userAccount || !carts) {
				return res.status(200).send({ message: "Empty Cart" });
			}

			const result = await this.handlePromoApplied(
				req,
				carts.totalCart,
				userAccount._id,
				PROMO_ACTIONS.checkoutWithPromo
			);

			if (result.invalid) {
				return res.status(200).send({ message: result.message });
			}

			const { listCartId, newOrderCreated } = await this.createOrder(
				result.totalMoney,
				userAccount._id,
				carts.results,
				PAYMENT_METHOD.shipCOD
			);

			mailService.sendMailAfterCheckout(
				userAccount.email,
				commonHelp.formatDateTime(newOrderCreated.createdAt)
			);

			await this.notificationOrderAdmin(
				userAccount,
				newOrderCreated._id,
				commonHelp.formatDateTime(newOrderCreated.createdAt)
			);

			//delete cart
			await cartHelp.deleteCart(listCartId);

			res.status(200).send({
				message: "Checkout success",
			});
		} catch (err) {
			console.log(err);
			res.status(200).send(err);
		}
	}

	/**
	 * @swagger
	 * /customer/checkout-paypal:
	 *   post:
	 *     summary: Checkout cart with Paypal method.
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
	 *                  fullname:
	 *                    type: string
	 *                    example: storage Byme.
	 *                  address:
	 *                    type: string
	 *                    example: Ho Chi Minh City
	 *                  numberPhone:
	 *                    type: string
	 *                    example: 0924714552
	 *                  email:
	 *                    type: string
	 *                    example: storage1520@gmail.com
	 *                  listPromoCode:
	 *                    type: array
	 *                    example: ['EVENT', 'NEWORDER']
	 *     responses:
	 *       201:
	 *         description: Checkout success
	 *       400:
	 *         description: Get list failed
	 */
	async checkoutPaypal(req, res) {
		try {
			const { userAccount, carts } = await this.updateInfoAndGetCart(req);

			if (!userAccount || !carts) {
				return res.status(200).send({ message: "Empty cart" });
			}
			const orderId = await orderHelp.getOrderId();

			const result = await this.handlePromoApplied(
				req,
				carts.totalCart,
				userAccount._id,
				PROMO_ACTIONS.checkPromo
			);

			if (result?.invalid || result.message) {
				return res.status(200).send({ message: result.message });
			}

			if (result.totalMoney === 0) {
				return res
					.status(200)
					.send({ message: "TotalMoney is 0. Please checkout with shipCOD" });
			}

			const payment = paypalService.setUpPayment(
				carts.results,
				result,
				userAccount._id,
				orderId
			);

			console.log(payment.transactions[0].item_list);
			console.log("test", payment.transactions[0].amount);

			paypalService.paypal.payment.create(payment, async (error, payment) => {
				if (error) {
					return res.status(200).send(error);
				} else {
					await Account.updateOne(
						{ _id: userAccount._id },
						{
							transaction: {
								id: payment.id,
								listCart: carts.results,
								listPromo: req.body.listPromoCode,
							},
						}
					);
					const link = payment.links.find(
						(link) => link.rel === "approval_url"
					);

					return res.status(200).send({ url: link.href });
				}
			});
		} catch (err) {
			console.error(err);
			res.status(200).send(err);
		}
	}

	async handleResultPaypal(req, res) {
		try {
			const payerId = req.query.PayerID;
			const paymentId = req.query.paymentId;

			paypalService.paypal.payment.get(paymentId, (error, payment) => {
				if (error) {
					// Handle the error
					throw new Error(error);
				}
				console.log(payment.transactions);
				const transaction = payment.transactions[0];
				const userId = payment.transactions[0].custom;
				const execute_payment_json = {
					payer_id: payerId,
					transactions: [
						{
							amount: {
								currency: transaction.amount.currency,
								total: transaction.amount.total,
							},
						},
					],
				};

				paypalService.paypal.payment.execute(
					paymentId,
					execute_payment_json,
					async (error, payment) => {
						if (error) {
							console.log(error.response);
							throw new Error(error.response);
						}

						console.log(payment);

						const account = await Account.findOne({ _id: userId });

						await promotionalController.handlePromoUsed(
							account.transaction?.listPromo,
							PROMO_ACTIONS.checkoutWithPromo,
							userId
						);

						const { listCartId, newOrderCreated } = await this.createOrder(
							transaction.amount.total,
							userId,
							account.transaction.listCart,
							PAYMENT_METHOD.paypal
						);

						mailService.sendMailAfterCheckout(
							account.email,
							commonHelp.formatDateTime(newOrderCreated.createdAt)
						);

						await this.notificationOrderAdmin(
							account,
							newOrderCreated._id,
							commonHelp.formatDateTime(newOrderCreated.createdAt)
						);
						//delete cart
						await cartHelp.deleteCart(listCartId);

						if (
							!account.payments.find((item) => item.paymentId === payment.id) &&
							account.transaction.id === payment.id
						) {
							account.payments.push({
								paymentId: payment.id,
								status: payment.state,
								method: payment.payer.payment_method,
								payerInfo:
									payment.payer.payer_info.first_name +
									payment.payer.payer_info.last_name,
								total: payment.transactions[0].amount.total,
								description: payment.transactions[0].description,
								time: payment.create_time,
							});

							await Account.updateOne(
								{ _id: userId },
								{ payments: account.payments, transaction: null }
							);
						}

						res.redirect(URL_REDIRECTS.redirectSuccess);
					}
				);
			});
		} catch (err) {
			console.error(err);
			res.status(200).send(err);
		}
	}

	/**
	 * @swagger
	 * /customer/myOrder:
	 *   get:
	 *     summary: Get my Order.
	 *     tags: [Customer Service]
	 *     security:
	 *        - bearerAuth: []
	 *     responses:
	 *       201:
	 *         description: Checkout success
	 *       400:
	 *         description: Get list failed
	 */
	async getMyOrder(req, res) {
		try {
			const userId = jwtHelp.decodeTokenGetUserId(
				req.headers.authorization.split(" ")[1]
			);

			const myOrders = await Order.find({
				customerId: userId,
			})
				.sort({ createdAt: -1 })
				.lean();

			res.status(200).send(myOrders);
		} catch (err) {
			console.log(err);
			res.status(400).send({ message: "Invalid input" });
		}
	}

	/**
	 * @swagger
	 * /customer/myOrderDetail/{orderDetailId}:
	 *   get:
	 *     summary: Get my Order Detail.
	 *     tags: [Customer Service]
	 *     parameters:
	 *        - in: path
	 *          name: orderDetailId
	 *          type: string
	 *          required: true
	 *          description: order ID of the order to get orderDetail.
	 *     security:
	 *        - bearerAuth: []
	 *     responses:
	 *       201:
	 *         description: list Order Details
	 *       400:
	 *         description: Get list failed
	 */
	async getMyOrderDetail(req, res) {
		try {
			const userId = jwtHelp.decodeTokenGetUserId(
				req.headers.authorization?.split(" ")[1]
			);

			let order = await Order.findOne({
				_id: req.params.orderDetailId,
				customerId: userId,
			});

			if (!order) {
				return res.status(200).send({ message: "Order not found" });
			}

			let orderDetails = await OrderDetail.find({
				orderDetailId: req.params.orderDetailId,
			});
			orderDetails = mutipleMongooseToObject(orderDetails);

			// get info of product
			let results = [],
				totalOrder = 0;
			await Promise.all(
				orderDetails.map(async (orderDetail) => {
					const { shoeInfo, infoBySizeId, size } = await cartHelp.getShoeInfo(
						orderDetail.shoeId,
						orderDetail.colorId,
						orderDetail.sizeId
					);

					const product = await Product.findOne({ _id: orderDetail.shoeId });
					const existComment = product.commentAndRate.find(
						(rate) => rate.userId === userId
					);
					if (existComment) {
						orderDetail.comment = existComment.comment;
						orderDetail.rateScore = existComment.rating;
					}

					orderDetail.image = shoeInfo.avatar;
					orderDetail.productName = product.name;
					orderDetail.productPrice = infoBySizeId.price;
					orderDetail.sizeName = size.name;

					totalOrder +=
						Number(orderDetail.productPrice) * Number(orderDetail.quantity);

					results.push(orderDetail);
				})
			);

			const discount = Number(totalOrder) - Number(order?.total);

			res.status(200).send({ results, total: order?.total, discount });
		} catch (err) {
			console.log(err);
			res.status(200).send({ message: "Invalid input" });
		}
	}

	/**
	 * @swagger
	 * /customer/confirmDelivered/{orderId}:
	 *   post:
	 *     summary: Change status order(in_transit -> completed).
	 *     tags: [Customer Service]
	 *     parameters:
	 *        - in: path
	 *          name: orderId
	 *          type: string
	 *          required: true
	 *          description: order ID of the order to get orderDetail.
	 *     security:
	 *        - bearerAuth: []
	 *     responses:
	 *       201:
	 *         description: Confirmed successful
	 *       400:
	 *         description: Get list failed
	 */
	async customerConfirmedDelivered(req, res) {
		try {
			const userId = jwtHelp.decodeTokenGetUserId(
				req.headers.authorization.split(" ")[1]
			);
			const [order, account] = await Promise.all([
				Order.findOne({ _id: req.params.orderId, customerId: userId }),
				Account.findOne({ _id: userId }),
			]);

			if (!order || order.status !== 2) {
				return res.status(403).send({ message: "Order Not Found" });
			}

			this.sendMailWithPromo(
				account,
				order._id,
				commonHelp.formatDateTime(order.createdAt)
			);

			Order.updateOne(
				{ _id: req.params.orderId },
				{ $set: { status: order.status + 1 } }
			).then(() => {
				res.status(200).send({ message: "Success" });
			});
		} catch (err) {
			console.log(err);
			res.status(200).send({ message: "Invalid input" });
		}
	}

	/**
	 * @swagger
	 * /customer/cancelOrder/{orderId}:
	 *   delete:
	 *     summary: Cancel order.
	 *     tags: [Customer Service]
	 *     parameters:
	 *        - in: path
	 *          name: orderId
	 *          type: string
	 *          required: true
	 *          description: order ID of the order to get orderDetail.
	 *     security:
	 *        - bearerAuth: []
	 *     responses:
	 *       201:
	 *         description: Cancel successful
	 *       400:
	 *         description: Get list failed
	 */
	async cancelOrder(req, res) {
		const orders = await Order.findById(req.params.orderId);
		if (orders.status !== 0) {
			return res
				.status(403)
				.send({ message: "Order be confirmed not allow to cancel" });
		}

		//delete
		await OrderDetail.deleteMany({ orderDetailId: req.params.orderId });
		await Order.deleteOne({ _id: req.params.orderId });
		res.status(200).send({ message: "Success" });
	}

	async updateInfoAndGetCart(req) {
		const userId = jwtHelp.decodeTokenGetUserId(
			req.headers.authorization.split(" ")[1]
		);
		// update info of user such as update number phone and address
		const userAccount = await Account.findOneAndUpdate(
			{ _id: userId },
			req.body,
			{ new: true }
		);
		const carts = await cartHelp.getCartByUserId(userId);
		if (!carts?.totalCart || carts.results.length === 0) {
			return { message: "Cart empty" };
		}

		return { userAccount, carts };
	}

	async handlePromoApplied(req, total, userId, action) {
		let discount;
		if (action === PROMO_ACTIONS.checkoutWithPromo) {
			discount = await promoController.handlePromo(
				req.body.listPromoCode,
				total,
				PROMO_ACTIONS.checkoutWithPromo,
				userId
			);
		} else {
			discount = await promoController.handlePromo(
				req.body.listPromoCode,
				total,
				PROMO_ACTIONS.checkPromo,
				userId
			);
		}

		if (discount?.invalid) {
			return { message: discount.message };
		}

		return discount;
	}

	async createOrder(totalMoney, userId, listCart, paymentMethod) {
		const listCartId = []; // list Cart Id to delete cart

		//create new order
		const newOrder = new Order({
			customerId: userId,
			total: totalMoney,
			status: 0,
			paymentMethod: paymentMethod,
		});
		const newOrderCreated = await newOrder.save();

		// create new order details and handle amount of product
		await Promise.all(
			listCart.map(async (cart) => {
				const newOrderDetail = new OrderDetail({
					orderDetailId: newOrderCreated._id,
					shoeId: cart.productId,
					sizeId: cart.sizeId,
					colorId: cart.colorId,
					quantity: cart.quantity,
					price: cart.productPrice,
				});
				listCartId.push(cart._id);
				await newOrderDetail.save();

				const catePro = await CatePro.findOne({
					cateId: cart.colorId,
					proId: cart.productId,
				});
			})
		);

		return { listCartId, newOrderCreated };
	}

	async sendMailWithPromo(userAccount, orderId, dateTime) {
		//send mail and coupon code for next order to customer
		const promoCode = await promoController.promoCheckoutSuccess(
			userAccount._id,
			orderId
		);

		mailService.sendMailAfterComplete(userAccount.email, promoCode, dateTime);
	}

	async notificationOrderAdmin(userAccount, orderId, dateTime) {
		mailService.sendMailForAdmin(userAccount.fullname, orderId, dateTime);
	}
}

module.exports = new order();
