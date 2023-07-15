const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcrypt");

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginAuth:
 *       type: object
 *       required:
 *         - accountName
 *         - password
 *       properties:
 *         accountName:
 *           type: string
 *           description: Account name of account
 *         password:
 *           type: string
 *           description: Password of account
 *       example:
 *         accountName: example@gmail.com
 *         author: 12345678
 */
const Account = new Schema(
	{
		fullname: {
			type: String,
		},
		accountName: {
			type: String,
		},
		userId: {
			type: String,
		},
		password: {
			type: String,
		},
		email: {
			type: String,
			// required: true,
		},
		address: {
			type: String,
			maxLength: 255,
		},
		numberPhone: {
			type: String,
			maxLength: 255,
		},
		permission: {
			type: Number,
		},
		authType: {
			type: String,
			enum: ["local", "google", "facebook"],
			default: "local",
		},
		picture: {
			type: String,
		},
		transaction: {
			type: Object,
			default: null,
		},
		payments: {
			type: Array,
			default: [],
		},
	},
	{
		timestamps: true,
	}
);

// hash password previous save user info
Account.pre("save", async function (next) {
	try {
		if (this.authType !== "local") {
			next();
		}
		const salt = await bcrypt.genSalt(10);
		const passwordHashed = await bcrypt.hash(this.password, salt);

		this.password = passwordHashed;
		next();
	} catch (err) {
		next(err);
	}
});

module.exports = mongoose.model("account", Account);
