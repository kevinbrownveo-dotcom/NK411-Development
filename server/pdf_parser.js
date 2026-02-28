const fs = require('fs');
const pdf = require('pdf-parse');
const path = 'C:\\Users\\Sam\\nk411\\NK411-Development\\Risk Register qanun.pdf';

const dataBuffer = fs.readFileSync(path);

pdf(dataBuffer).then(function (data) {
    fs.writeFileSync('C:\\Users\\Sam\\nk411\\pdf_output.txt', data.text);
    console.log('PDF Uğurla oxundu və mətinləşdirildi!');
}).catch(function (err) {
    console.error('Xeta:', err);
});
