const Cart = require("../app/models/cart.model");
const Product = require("../app/models/product.model");
const CatePro = require("../app/models/cateProduct.model");
const Category = require("../app/models/category.model");
const { mutipleMongooseToObject, mongooseToObject } = require("./mongoose");

class cartHelp {
	async updateDuplicateCart(req, userId, shoeInfo, priceOfShoe, sizeName) {
		let flag = 0,
			product,
			cartUpdated;
		let carts = await Cart.find({ userId: userId });
		carts = mutipleMongooseToObject(carts);
		await Promise.all(
			carts.map(async (cart) => {
				if (
					cart.productId == req.body.productId &&
					cart.sizeId == req.body.sizeId &&
					cart.colorId == req.body.colorId
				) {
					cart.quantity += req.body.quantity;
					product = await Product.findOne({ _id: req.body.productId }).lean();
					product.price = priceOfShoe;
					product.image = shoeInfo.avatar;
					cartUpdated = await Cart.findOneAndUpdate(
						{ _id: cart._id },
						{
							quantity: cart.quantity,
							total: priceOfShoe * cart.quantity,
						},
						{ returnDocument: "after" }
					).lean();
					cartUpdated.sizeName = sizeName;
					flag = 1;
				}
			})
		);
		if (flag === 1) return { product, cartUpdated };
		return {};
	}

	async getCartByUserId(userId) {
		let carts = await Cart.find({ userId: userId });
		carts = mutipleMongooseToObject(carts);
		let totalCart = 0;

		// get info of product
		const results = [];
		if (carts?.length) {
			await Promise.all(
				carts.map(async (cart) => {
					const { shoeInfo, infoBySizeId, size } = await this.getShoeInfo(
						cart.productId,
						cart.colorId,
						cart.sizeId
					);

					const product = await Product.findOne({ _id: cart.productId });

					cart.image = shoeInfo.avatar;
					cart.productName = product.name;
					cart.productPrice = infoBySizeId.price;
					cart.sizeName = size.name;
					totalCart += cart.quantity * infoBySizeId.price;
					results.push(cart);
				})
			);
			return { results, totalCart };
		}
	}

	async deleteCart(arrCartId) {
		const deletedCart = await Cart.deleteMany({ _id: { $in: arrCartId } });

		if (deletedCart.modifiedCount > 0) return true;
		return false;
	}

	async getShoeInfo(proId, colorId, sizeId) {
		const shoeInfo = await CatePro.findOne({
			proId: proId,
			cateId: colorId,
		});

		const infoBySizeId = shoeInfo?.listSizeByColor?.find(
			(size) => size.sizeId === sizeId
		);

		const size = await Category.findOne({ _id: infoBySizeId?.sizeId });

		if (!shoeInfo || !infoBySizeId) {
			throw new Error("Invalid Input");
		}

		return { shoeInfo, infoBySizeId, size };
	}
}

module.exports = new cartHelp();
