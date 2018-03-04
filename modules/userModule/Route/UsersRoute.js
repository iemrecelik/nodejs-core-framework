const express = require('express')
	, router = express.Router()
	, csurf = require('csurf')
	, multer = require('multer')
	, usersCtrl = require(__defined.moduleUrl + 'Controller/UsersController.js');

const csrfProtection = csurf({ cookie: true });
const upload = multer({
	fileFilter: fileFilter,
	// limits: { fileSize: 3000000 }
}); // for parsing multipart/form-data

let actionIndex = (req, res) => {usersCtrl.index(req, res)}
	, actionUpdateSettings = (req, res) => {usersCtrl.updateSettings(req, res)}
	, actionUpdateProfileImg = (req, res) => {usersCtrl.updateProfileImg(req, res)}
	, actionCreateUser = (req, res) => {usersCtrl.createUser(req, res)};

let processes = {
	'getIndexProc': [csrfProtection, actionIndex],
	'postIndexProc': [csrfProtection, actionUpdateSettings],
	'postCreateUserProc': [csrfProtection, actionCreateUser],
	'postprImgUpProc': [upload.single('profileImg'), csrfProtection, actionUpdateProfileImg]
}

router.route('/')
	.get(processes.getIndexProc)
	.post(processes.postIndexProc);

router.post('/create-user', processes.postCreateUserProc);

router.post('/profile-img-up', processes.postprImgUpProc);

router.all('/', __defined.errorHandle);

function fileFilter(req, file, cb){
	let regex = /png|jpeg|jpg/;
	
	if(regex.test(file.mimetype))
		cb(null, true)
	else
		cb(null, false)	
	
	// cb(new Error('entered wrong file type'))
}

module.exports = router;