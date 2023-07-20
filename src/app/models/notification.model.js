const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Notification = new Schema(
	{
		type: { type: String, maxLength: 255, required: true },
		data: { type: mongoose.Schema.Types.Mixed, required: true },
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model("Notification", Notification);
