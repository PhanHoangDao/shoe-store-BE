const multer = require("multer");

module.exports = function (fileName) {
	const maxSize = 5200000;
	const storage = multer.diskStorage({
		destination: function (req, file, cb) {
			// edit storage to save
			cb(null, "./src/public/uploadWithRefactorDB/");
		},
		filename: function (req, file, cb) {
			// edit file name to save (duplicate)
			cb(null, file.originalname);
			//   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
			//   cb(null, file.fieldname + '-' + uniqueSuffix)
		},
	});
	return (upload = multer({
		storage: storage,
		limits: { fileSize: maxSize },
		fileFilter: function (req, file, cb) {
			if (
				file.mimetype == "image/png" ||
				file.mimetype == "image/jpg" ||
				file.mimetype == "image/jpeg" ||
				file.mimetype == "image/webp"
			) {
				cb(null, true);
			} else {
				const err = "Only .png, .jpg, .webp and .jpeg format allowed!";
				return cb(err, false);
			}
		},
	}).array(`${fileName}`, 100));
	// return upload = multer({storage: storage}).single(`${fileName}`);
};
