const fs = require('fs')
const createCsvWriter = require('csv-writer').createObjectCsvWriter
const area = require('./children/json/area')
const cities = require('./children/json/cities')
const continents = require('./children/json/continents')
const countries = require('./children/json/countries')
const regions = require('./children/json/regions')
const states = require('./children/json/states')

let all_data = []

function convertGeoData() {
    let src_data = { area, cities, continents, countries, regions, states }

    let levels = {
        continents: 1,
        countries: 2,
        states: 3,
        // area: 4,
        cities: 4,
        regions: 5,
    }

    let country_cont = {}
    let state_cont = {}
    let city_cont = {}

    for (let name of ['continents', 'countries', 'states', 'cities', 'regions']) {
        for (let row of src_data[name].RECORDS) {
            let cont_id
            let level = levels[name]
            switch (level) {
                case 1:
                    cont_id = row.id
                    break
                case 2:
                    cont_id = row.continent_id
                    country_cont[row.id] = cont_id
                    break
                case 3:
                    cont_id = country_cont[row.country_id]
                    state_cont[row.id] = cont_id
                    break
                case 4:
                    cont_id = state_cont[row.state_id]
                    city_cont[row.id] = cont_id
                    break
                case 5:
                    cont_id = city_cont[row.city_id]
            }
            if (!cont_id) {
                cont_id = '0'
            }
            if (row.code == 'ARM') {
                console.log(row)
                console.log(cont_id + (row.code_full || row.code || ''))
            }
            all_data.push({
                level: levels[name],
                code: cont_id + (row.code_full || row.code || ''),
                name: row.name,
                full_name: row.full_name,
                cname: row.cname.replace('　', ''),
                full_cname: row.full_cname,
                lower_name: row.lower_name,
            })
        }
    }

    all_data.sort((a, b) => a.level < b.level ? -1 : (a.level > b.level ? 1 : (a.code < b.code ? -1 : a.code > b.code)))

    createCsvWriter({
        path: "dist/region.csv",
        header: [
            { id: 'level', title: 'LEVEL' },
            { id: 'code', title: 'code' },
            { id: 'name', title: 'name' },
            { id: 'full_name', title: 'full_name' },
            { id: 'cname', title: 'cname' },
            { id: 'full_cname', title: 'full_cname' },
            { id: 'lower_name', title: 'lower_cname' },
        ],
        // header: ['level', 'code', 'code_full', 'name', 'cname', 'lower_name'],
    }).writeRecords(all_data).then(() => {
        console.log('done')
    }).catch(err => console.log(err))

    fs.writeFileSync('dist/region.json', JSON.stringify({ data: all_data }, null, '  '), 'utf8')
}

let nameSorted
function initData() {
    console.log('all_data', all_data.length)
    all_data = all_data.filter(v=>v.cname)
    all_data.sort((a, b) => a.code < b.code ? -1 : a.code > b.code ? 1 : 0)
    nameSorted = JSON.parse(JSON.stringify(all_data))
    nameSorted.sort((a, b) => a.cname < b.cname ? -1 : a.cname > b.cname ? 1 : 0)
    /*
    var tmpFile = fs.createWriteStream('./dist/foo.txt')
    for(var i = 0; i < nameSorted.length; i++) {
        tmpFile.write('' + i +' ')
        tmpFile.write(JSON.stringify(nameSorted[i]))
        tmpFile.write('\n')
    }
    tmpFile.end()
    */
}

let debug = false
function dlog(...v) {
    if(debug) {
        console.log(...v)
    }
}

// 根据 code 前缀，查找最精确的子元素
function findMatch(address, pnode) {
    if(address[0] == '省' || address[0] == '市'  || address[0] == '州') {
        address = address.substring(1)
    }
    if(address.length==0) {
        return pnode
    }
    let p = 0
    let q = all_data.length
    let i = 0;
    let v = all_data[i]
    let pcode = pnode.code
    dlog('>> startFindMatch',address, v.code, 'pcode', pcode)
    while (p < q) {
        i=Math.floor((p+q)/2)
        v = all_data[i]
        if(v.code == pcode) {
            dlog('>> 1 code',address, v.code, 'pcode', pcode)
            break
        }
        if(v.code < pcode) {
            dlog('>> 2 code',address, v.code, 'pcode', pcode)
            p = i+1
        } else {
            dlog('>> 3 code',address, v.code, 'pcode', pcode)
            q = i
        }
    }
    dlog(">> findMatch", address, "v", v, "pnode", pnode)
    // 正向搜索
    for(var j=i;j<all_data.length;j++) {
        if(!all_data[j].code.startsWith(pcode)) {
            break
        }
        v = all_data[j]
        if(address.startsWith(v.cname)) {
            dlog(">> found1", v)
            address = address.replace(v.cname, '')
            return findMatch(address, v)
        }
    }
    // 反向搜索
    for(var j=i-1;j>=0;j--) {
        if(!all_data[j].code.startsWith(pcode)) {
            break
        }
        v = all_data[j]
        if(address.startsWith(v.cname)) {
            dlog(">> found2", v)
            address = address.replace(v.cname, '')
            return findMatch(address, v)
        }
    }
    return v
}

function findBestMatchName(address) {
    let p = 0;
    let q = nameSorted.length - 1 
    let i = 0;
    let v = nameSorted[i]
    // 查找最接近的地址
    dlog('startFind', address, p, q, i)
    while(p<q) {
        // 中间位置
        i = Math.floor((p+q)/2)
        dlog("p", p, "q", q, "i", i)
        v = nameSorted[i]
        if(v.cname == address) {
            dlog("11", v.cname, "==", address)
            return v
        }
        if(v.cname.length >=2 && address.startsWith(v.cname)) {
            dlog('1111 found', v.cname, address)
            break
        }
        if(v.cname < address) {
            dlog("22", v.cname, ">", address)
            p = i + 1
        } else {
            dlog("33", v.cname, "<", address)
            q = i
        }
    }
    if(!address.startsWith(v.cname)) {
        return {}
    }
    dlog('findBestMatchName', address, "v", v)
    address = address.replace(v.cname, "")
    if(address.length > 0) {
        return findMatch(address, v)
    }
    return v
}

var unknowAddresses = {}

function convertCZIPData() {
    let csvWriter = createCsvWriter({
        path: "./dist/czip.csv",
        header: [
            "startIp",
            "endIp",
            "address",
            "sp",
            "code",
            "cname",
        ],
    })
    let records = []
    // convert 纯真ip
    let rl = require('readline').createInterface(fs.createReadStream('./czip/ipdata.txt'))
    rl.on('line', (line) => {
        let parts = line.split(/\s+/g)
        let address = parts[2]
        let sp = parts[3]
        let row = { 
            startIp: parts[0],
            endIp: parts[1],
            address,
            sp,
        }
        if(!address) {
            return
        }
        if(address.startsWith('IANA') || address == '纯真网络') {
            return
        }
        let v = findBestMatchName(address)
        // dlog("address", address, "geo", v.code, v.cname)
        row.code = v.code
        row.cname = v.cname
        records.push(row)
        if(!v.cname) {
            unknowAddresses[address] = (unknowAddresses[address] || 0) + 1
            debug = true
            // v = findBestMatchName(address)
            // dlog("address", address, "geo", v.code, v.cname)
            debug = false
        }
    }).on('close', () => {
        dlog('end')
        console.log(unknowAddresses)
        csvWriter.writeRecords(records)
    })
}

convertGeoData()
initData()
convertCZIPData()