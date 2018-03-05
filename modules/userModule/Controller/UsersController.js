const Users = require(__defined.moduleUrl + 'Document/Users.js');

class UsersController extends Controller{

	index(req, res){

		Users.find((err, data) => {

			res.render('Users/lists', {
				lists: data,
			});	
		});
	}

	createUser(req, res){

		let validInfo = req.flash('validInfo')[0];
		
		res.render('Users/create', {
			validInfo: validInfo,
			csrfToken: req.csrfToken(),
		});	
	}

	async createUserPost(req, res){
		
		let post = req.body;
		let validSchema = this.getValidSchema('users');

		const ValidatorCtrl = this.getClass('ValidatorCtrl')
		let validInfo = ValidatorCtrl.valid(validSchema, post);
		
		if(validInfo.errorSt === false){

			try{
				validInfo.val.password = this.crypto(validInfo.val.password);		

				await Users.create(validInfo.val);

				delete validInfo.val;
				delete validInfo.rawVal;

				validInfo.succeed = 'Kullanıcı başarıyla kaydedildi.';

			}catch(err){
				console.log(err)
			}//end try
		}//end if

		req.flash('validInfo', validInfo);
		res.redirect('/user/create');
	}

	updateUser(req, res){

		let validInfo = req.flash('validInfo')[0];

		Users.findOne({_id: req.params.id}, (err, data) => {

			res.render('Users/update', {
				validInfo: validInfo,
				userData: data,
				csrfToken: req.csrfToken(),
			});		
		})
	}

	async updateUserPost(req, res){
		
		let post = req.body;
		let validSchema = this.getValidSchema('users');

		const ValidatorCtrl = this.getClass('ValidatorCtrl')
		let validInfo = ValidatorCtrl.valid(validSchema, post);
		
		if(validInfo.errorSt === false){
			
			let password = this.crypto(validInfo.val.password);
			delete validInfo.val.password;
			delete validInfo.rawVal.password;

			await Users.findOne({ _id: req.params.id, password: password}, (err, data) => {

				if(data){
					Users.updateOne(
						{ _id: req.params.id },
						{ $set: validInfo.val },
						(err, data) => {}
					)
					
					validInfo.succeed = 'Ayarlarınız başarıyla düzenlenmiştir.';		
				}else{
					validInfo.errorSt = true
					validInfo.error.password = `Lütfen şifrenizi doğru giriniz.`;
				}
			})
			
		}//end if

		req.flash('validInfo', validInfo);
		res.redirect(`/user/${req.params.id}/update`);
	}

	async updateProfileImg(req, res){

		let error, success;
		let file = req.file;

		let regex = /png|jpeg|jpg/;

		if(!file)
			error = 'Please choose a file';
		else if(!regex.test(file.mimetype))
			error = 'Entered wrong the file format. Exist formats : png, jpeg, jpg';
		else if(file.size > 1000000)
			error = 'You cant upload a file larger than 1MB';
		else{

			const ImageFilter = this.getClass('ImageFilter')

			let filtImgInfoLProm = await ImageFilter.uploadFilter({
				file: file.buffer, filt: 'profileL', imgExt: file.mimetype.match(/[^\/]+$/)[0]
			});

			let profileImg = filtImgInfoLProm.imgName.match(/\/public\/.+/)[0];

			await Users.findOneAndUpdate(
				{ _id: req.params.id },
				{ $set: {profileImg: profileImg} },
				(err, data) => {
					if(err) console.log(err);
					ImageFilter.deleteImg(data.profileImg);
				}
			)
			
			success = 'Successed upload the file';
		}

		req.flash('validInfo', {errorUpload: error, successUpload: success});
		res.redirect(`/user/${req.params.id}/update`);
	}
}

module.exports = new UsersController();