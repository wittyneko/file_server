const fs = require("fs");
const path = require('path')
const crypto = require('crypto');
const express = require('express')
const serveIndex = require('serve-index')
const multer = require('multer')
const cookieParser = require('cookie-parser');

if (!fs.existsSync('oss')) {
    fs.mkdirSync('oss')
}
if (!fs.existsSync('key')) {
    fs.writeFileSync('key', crypto.randomBytes(16).toString('hex'))
}

function md5(data) {
    let hash = crypto.createHash('md5');
    return hash.update(data).digest('base64');
}

function protocol(req) {
    var proto = req.headers['x-forwarded-proto'];
    if(proto == null) proto = req.socket.encrypted ? 'https': 'http'
    return proto;
}

const app = express()
// 访问认证认证中间件
app.use(cookieParser('secret'));
const keyToken = md5(fs.readFileSync('key').toString().split('\n')[0])
app.use((req, res, next) => {
    // 任何路由信息都会执行这里面的语句
    console.log(`request ${req.method} ${req.url}`);
    console.log(`request auth ${req.cookies["key"] == keyToken}`);
    if (req.url.startsWith('/uploads')) {
        switch (req.cookies['key']) {
            case keyToken:
                break
            default: {
                res.send(401, "Auth Error!")
                return
            }
        }
    }
    // 交给下一个中间件处理，中间件是按注册顺序执行
    next();

});

// 允许直接访问静态文件
app.use('/oss', express.static('oss'));
app.use('/uploads', express.static('uploads'));
// 展示目录结构
app.use('/oss', serveIndex('oss'));
app.use('/uploads', serveIndex('uploads'));

//上传中间件
const multerObj = multer({
    dest: 'uploads/'
})
app.use(multerObj.any())

app.get('/.osslogin', (req, res, next) => {
    res.setHeader('Content-Type', 'text/html')
    res.sendFile(path.join(__dirname, 'login.html'))

})

app.post('/.osskey', (req, res, next) => {
    res.cookie('key', md5(req.headers.key))
    res.status(200).send('success')
})


app.get('/upload', (req, res, next) => {
    res.setHeader('Content-Type', 'text/html')
    res.sendFile(path.join(__dirname, 'index.html'))
})

app.post('/upload', (req, res, next) => {
    console.log(req.files)
    var files = req.files
    var imgUrls = [];
    files.forEach((item) => {
        var originalname = item.originalname;
        // var nameArray = originalname.split('\.');
        // var mime = nameArray.pop();
        var mimeIndex = originalname.lastIndexOf('\.')
        var mime = mimeIndex != -1 ? originalname.substr(mimeIndex) : ""
        var name = mimeIndex != -1 ? originalname.substr(0, mimeIndex) : originalname
        var oldPath = `uploads/${item.filename}`

        // 审核认证
        if (req.cookies["key"] == keyToken) {
            // 认证通过移动到公共区
            var newPath = `oss/${item.filename}${mime}`
            fs.rename(oldPath, newPath, (err) => {
                if (err) {
                    console.error(err)
                }
            });
            //var proto = req.socket.encrypted ? 'https' : 'http';
            var proto = protocol(req);
            imgUrls.push(`${proto}://${req.headers.host}/${newPath}`)
        } else {
            var newPath = `uploads/${name}-${item.filename}${mime}`
            fs.rename(oldPath, newPath, (err) => {
                if (err) {
                    console.error(err)
                }
            });
        }
    });
    if (req.cookies["key"] == keyToken) {
        res.send(200, { 'code': 1, imgs: imgUrls })
    } else {
        res.send(200, { 'code': 0, 'message': " Wait audit" })
    }
})
app.listen(3000)
