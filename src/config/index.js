require("dotenv").config();
const mongoose = require("mongoose");

async function connect() {
	try {
		mongoose.set("strictQuery", false);
		await mongoose.connect(process.env.MONGODB_REFACTOR_CLOUD, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
			// useCreateIndex: true,
		});
		console.log("Connect Successfully");
	} catch (err) {
		console.log(err);
		console.log("Connect failed");
	}
}
module.exports = {
	connect,
	ACCESS_JWT_SECRET: process.env.ACCESS_TOKEN_SECRET,
	REFRESH_JWT_SECRET: process.env.REFRESH_TOKEN_SECRET,
};
