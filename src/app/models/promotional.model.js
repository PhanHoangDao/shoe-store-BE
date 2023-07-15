const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Promotional = new Schema(
	{
		code: { type: String, maxLength: 255 },
		discount: { type: Number },
		description: { type: String, maxLength: 255 },
		startDate: { type: Date },
		endDate: { type: Date },
		userId: { type: String, maxLength: 255 },
		amount: { type: Number },
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model("promotional", Promotional);
