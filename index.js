const express = require('express')
const fs = require("fs");
const path = require('path')
const multer = require('multer')

const keyToken = fs.readFileSync('key').toString()
const app = express()
// 访问认证认证中间件
app.use((req, res, next) => {
    // 任何路由信息都会执行这里面的语句
    console.log('this is a api request ');
    console.log(req);
    console.log(res);
    console.log(req.headers["key"] != keyToken);
    if(req.url.startsWith('/upload') && req.headers["key"] != keyToken) {
        res.send(401, "Auth Error!")
        return;
    }
    // 把它交给下一个中间件，中间件是按注册顺序序执行
    next();
    
});

//上传中间件
const multerObj = multer({
    dest: 'uploads/'
})
app.use(multerObj.any())

// 允许直接访问静态文件
app.use('/oss', express.static('oss'));

app.get('/', (req, res, next) => {
    res.setHeader('Content-Type', 'text/html')
    fs.statSync
    res.sendFile(path.join(__dirname, 'index.html'))
})

app.post('/upload', (req, res, next) => {
    console.log(req.files)
    var files = req.files
    var resUrls = []; // 返给前端做回显 link 
    // 多图：修改文件后缀
    files.forEach((item) => {
        //以下代码得到文件后缀
        var name = item.originalname;
        var nameArray = name.split('\.');
        var nameMime = [];
        l = nameArray.pop();
        nameMime.unshift(l);
        while (nameArray.length != 0 && l != '.') {
            l = nameArray.pop();
            nameMime.unshift(l);
        }
        //Mime是文件的后缀
        var mime = nameMime.join('');
        //重命名文件 加上文件后缀
        // 这里的路径问题一定要注意：本瓜反复测试了很多才发现是“路径问题导致不能正常修改文件名”
        fs.rename('./uploads/' + item.filename, './oss/' + item.filename + mime, (err) => {
            if (err) {
                console.log(err)
            }
        });
        resUrls.push(`/oss/${item.filename + mime}`)
    });
    res.send(200, {
        'code': 1,
        message: resUrls
    })
})
app.listen(3000)
