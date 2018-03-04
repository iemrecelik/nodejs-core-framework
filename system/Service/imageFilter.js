const gm = require('gm').subClass({imageMagick: true});
const fs = require('fs');
const crypto = require('crypto');

module.exports = class imageFilter{
	
	constructor(filters){
		this.defaultImgs = ['avatar0.png','avatar1.png',
							'avatar2.png','avatar3.png',
							'avatar4.png'];
		
		this.fileConfig = {};
		this.fileConfig.size = 1000000;
		this.fileConfig.format = ['JPG', 'JPEG', 'PNG'];

		this.filters = filters;
		this.lastFiltImgInfo = {};
	}

	async uploadFilter({file, filt, imgName = this.defaultImgName(), imgExt = 'jpg'}){
		
		this.lastFiltImgInfo = {};

		if (this.filters['filters'][filt] == null)
			throw new Error(`${filt} : this filter name is not defined`);

		let filter = this.filters['filters'][filt];
		let dir = path.join(__defined.baseUrl , filter['writePath']);
		let gmFilt = gm;

		if(filter.config){
			this.fileConfig.size = filter.config.size || this.fileConfig.size
			this.fileConfig.format = filter.config.format || this.fileConfig.format
		}

		gmFilt = gmFilt(file)
		await this.imgConfigFilter(gmFilt);

		for(let key in filter){
			
			if(key === 'writePath' || key === 'config')
				continue;

			gmFilt = gmFilt[key](...filter[key]);
		}

		this.mkdirParent(dir);

		this.lastFiltImgInfo.imgName = path.join(dir, imgName) + '.' + imgExt;

		gmFilt.write(this.lastFiltImgInfo.imgName, function (err) {
		  	if(err) console.log(err)
		});

		return this.lastFiltImgInfo
	}

	imgConfigFilter(gmFilt){

		return new Promise((resolve, reject) => {

			gmFilt
			.format((err, format) => {
				if(err) console.log(err);
				if(this.fileConfig.format.indexOf(format) < 0)
					throw new Error(`invalid format : ${format}, ` +
						`this format(s) must be : ${this.fileConfig.format.toString()}`);
					resolve()
			})
			.filesize((err, size) => {
				if(err) console.log(err)
				if(this.fileConfig.size < size)
					throw new Error(`image size must be than ${size}`);
				
				this.lastFiltImgInfo.size = size;
			})
		})
	}

	mkdirParent(dirPath) {

		if(!fs.existsSync(dirPath)){
			
			this.mkdirParent(path.dirname(dirPath))

			fs.mkdir(dirPath, (err) => {
				if(err) console.log(err);
			});
		}
	};

	deleteImg(imgPath){

		if(this.defaultImgs.indexOf(imgPath.match(/[^\/]+$/)[0]) < 0){
			
			fs.unlink(path.join(__defined.baseUrl, imgPath), (err) => {
				if (err) throw err;
			});
		}
	}

	getGmClass(){
		return gm;
	}

	defaultImgName(){
        
       	const secret = 'dateNowDefaultName';
		return crypto.createHmac('sha256', secret)
		                   .update(Date.now().toString())
		                   .digest('hex');
    }

}