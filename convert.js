const fs = require('fs')
const createCsvWriter = require('csv-writer').createObjectCsvWriter
const area = require('./children/json/area')
const cities = require('./children/json/cities')
const continents = require('./children/json/continents')
const countries = require('./children/json/countries')
const regions = require('./children/json/regions')
const states = require('./children/json/states')

let all_data = []

let src_data = {area, cities, continents, countries, regions, states}

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
        if(!cont_id) {
            cont_id = '0'
        }
        if(row.code == 'ARM') {
            console.log(row)
            console.log(cont_id+(row.code_full||row.code||''))
        }
        all_data.push({
            level: levels[name],
            code: cont_id+(row.code_full||row.code||''),
            name: row.name,
            full_name: row.full_name,
            cname: row.cname.replace('　', ''),
            full_cname: row.full_cname,
            lower_name: row.lower_name,
        })
    }
}

all_data.sort((a, b) => a.level < b.level ? -1 : (a.level > b.level ? 1 : (a.code < b.code ? -1 : a.code > b.code )))

createCsvWriter({
    path: "dist/region.csv",
    header: [
        {id: 'level', title: 'LEVEL'},
        {id: 'code', title:'code'},
        {id: 'name', title:'name'},
        {id: 'full_name', title:'full_name'},
        {id: 'cname', title:'cname'},
        {id: 'full_cname', title:'full_cname'},
        {id: 'lower_name', title:'lower_cname'},
    ],
    // header: ['level', 'code', 'code_full', 'name', 'cname', 'lower_name'],
}).writeRecords(all_data).then(()=>{
    console.log('done')
}).catch(err => console.log(err))

fs.writeFileSync('dist/region.json', JSON.stringify({data:all_data},null,'  '), 'utf8')