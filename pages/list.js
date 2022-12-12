import React, { useState, useEffect } from 'react'
import styles from '../styles/Home.module.css'

export async function getServerSideProps(context) {

    let { address } = context.query

    if (!address) {
        return {
            props: {
                balances: [],
                addresses: [],
            }
        }
    }

    if (address.includes(',')) {
        address = address.split(',')
    } else {
        address = [address]
    }

    const filters = [{field: 'address', op: 'IN', value: address}, {field: 'asset', op: '!=', value: 'XCP'}]

    const options = getOptions(filters, 'get_balances', 0)
    
    const res = await fetch(process.env.COUNTERPARTY_API_URL, options)
    const data = await res.json()

    if (data.result.length == 1000) {
        let offset = 1000
        let moreData = true
        while (moreData) {
            const options = getOptions(filters, 'get_balances', offset)
            const res = await fetch(process.env.COUNTERPARTY_API_URL, options)
            const data2 = await res.json()
            data.result = data.result.concat(data2.result)
            if (data2.result.length < 1000) {
                moreData = false
            }
            offset += 1000
        }
    } 

    const balancesWithDiv = data.result.map((item) => {
        if (item.divisible == 1) {
            item.quantity = item.quantity / 1e8
        }
        return item
    })

   
    return {
        props: {
            balances: balancesWithDiv,
            addresses: address,
        }
    }
}


function getOptions(filters, method, offset) {

    let params = {
        filters,
        filterop: 'and',
        offset: offset
    }

    if(!filters) {
        params = {}
    }

    const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        Accept: 'application/json, text/javascript',
        Authorization: 'Basic ' + Buffer.from('rpc:1234').toString('base64'),
    },
    body: JSON.stringify({
        jsonrpc: '2.0',
        id: 0,
        method: method,
        params: params
    }),
    };

    return options
}   

function getAssetArray(data) {
    let assetArray = []
    data.forEach((item) => {
        assetArray.push(item.asset)
    })
    assetArray = [...new Set(assetArray)]
    return assetArray
}

function getAssetArrayChunks(assetArray) {
    let assetArrayChunks = []
    let chunkSize = 500
    for (let i = 0; i < assetArray.length; i += chunkSize) {
        assetArrayChunks.push(assetArray.slice(i, i + chunkSize))
    }
    return assetArrayChunks
}

async function fetchIssuances(assetArray) {
    const filters = [{field: 'asset', op: 'IN', value: assetArray}, {field: 'status', op: '==', value: 'valid'}]
    const options = getOptions(filters, 'get_issuances', 0)

    const res = await fetch(process.env.COUNTERPARTY_API_URL, options)
    const data = await res.json()

    //if data.result.length is 1000 then there are more results and we need to fetch again until we get less than 1000 and then return the data
    if (data.result.length == 1000) {
        let offset = 1000
        let moreData = true
        while (moreData) {
            const options = getOptions(filters, 'get_issuances', offset)
            const res = await fetch(process.env.COUNTERPARTY_API_URL, options)
            const data2 = await res.json()
            data.result = data.result.concat(data2.result)
            if (data2.result.length < 1000) {
                moreData = false
            }
            offset += 1000
        }
    } 
    
    return data.result
    

}

async function fetchBlockHeight() {
    const options = getOptions(null, 'get_running_info', 0)
    const res = await fetch(process.env.COUNTERPARTY_API_URL, options)
    const data = await res.json()
    console.log(data)
    return data.result.last_block.block_index
}

export default function Home({balances, addresses}) {

    console.log(balances)

    useEffect(() => {
        async function fetchData() {

            //fetchIssuances for each chunk of getAssetArrayChunks
            const assetArrayChunks = getAssetArrayChunks(getAssetArray(balances))
            let assetInfo = []
            for (let i = 0; i < assetArrayChunks.length; i++) {
                const data = await fetchIssuances(assetArrayChunks[i])
                assetInfo = assetInfo.concat(data)
            }
            //console.log(assetInfo)

            //create an object with the asset as the key and assetInfo elements which match the asset as an array of objects in the value
            const assetInfoObj = {}
            assetInfo.forEach((item) => {
                if (assetInfoObj[item.asset]) {
                    assetInfoObj[item.asset].push(item)
                } else {
                    assetInfoObj[item.asset] = [item]
                }
            }
            )
            //console.log(assetInfoObj)

            //add the assetInfoObj to the balances array by matching the asset and assetInfoObj key and add the value to a new element called issuances
            const balancesWithIssuances = balances.map((item) => {
                item.issuances = assetInfoObj[item.asset]
                item.description = assetInfoObj[item.asset][item.issuances.length-1].description
                item.locked = assetInfoObj[item.asset][item.issuances.length-1].locked
                item.issuer = assetInfoObj[item.asset][item.issuances.length-1].issuer
                item.block_index = assetInfoObj[item.asset][0].block_index
                item.asset_longname = assetInfoObj[item.asset][0].asset_longname
                item.assetForSorting = item.asset_longname ? item.asset_longname : item.asset

                //calculate the total quantity of the asset from the issuances
                let totalQuantity = 0
                assetInfoObj[item.asset].forEach((issuance) => {
                    totalQuantity += issuance.quantity
                })
                item.supply = totalQuantity
                if(item.divisible == 1) {
                    item.supply = item.supply / 1e8
                }

                return item
            })

            const blockHeight = await fetchBlockHeight()

            setBlockHeight(blockHeight)
            setStateData(balancesWithIssuances)
          }
        fetchData()   
    }, [])

    //console.log(balances)

    const clearFilters = (data) => {
        setStateData((data) => [...balances])
        setFiltersApplied({hideUnlocked: false, hideDivisible: false, hideNumericAssets: false, hideSubassets: false})
    }
    
    const sortDataAscByKey = (data, key) => {
        const sortedData = data.sort((a, b) => {
            return a[key] - b[key]
        }
        )
        setStateData((data) => [...sortedData])
    }

    const sortDataDescByKey = (data, key) => {
        const sortedData = data.sort((a, b) => {
            return b[key] - a[key]
        }
        )
        setStateData((data) => [...sortedData])
    }

    const sortDataAscByKeyString = (data, key) => {
        const sortedData = data.sort((a, b) => {
            return a[key].localeCompare(b[key])
        }
        )
        setStateData((data) => [...sortedData])
    }

    const sortDataDescByKeyString = (data, key) => {
        const sortedData = data.sort((a, b) => {
            return b[key].localeCompare(a[key])
        }
        )
        setStateData((data) => [...sortedData])
    }
    
    const filterHideNumericAssets = (data) => {
        const filteredData = data.filter((item) => {

            if(item.asset_longname) {
                return true
            }

            return !item.asset.startsWith("A")
        }

        )   
        setStateData(filteredData)
        setFiltersApplied((filtersApplied) => ({...filtersApplied, hideNumericAssets: true}))

    }

    const filterHideSubassets = (data) => {
        const filteredData = data.filter((item) => {
            return !item.asset_longname
        })
        setStateData(filteredData)
        setFiltersApplied((filtersApplied) => ({...filtersApplied, hideSubassets: true}))
    }

    const filterHideUnlocked = (data) => {
        const filteredData = data.filter((item) => {
            return checkLocked(item.issuances)
        }
        )
        setStateData(filteredData)
        setFiltersApplied((filtersApplied) => ({...filtersApplied, hideUnlocked: true}))
    }

    const filterHideDivisible = (data) => {
        const filteredData = data.filter((item) => {
            return item.divisible == 0
        }
        )
        setStateData(filteredData)
        setFiltersApplied((filtersApplied) => ({...filtersApplied, hideDivisible: true}))
    }

    const [stateData, setStateData] = useState(balances)
    const [blockHeight, setBlockHeight] = useState("...")
    const [filtersApplied, setFiltersApplied] = useState({hideUnlocked: false, hideDivisible: false, hideNumericAssets: false, hideSubassets: false})
    
    
    return (
        <div className={styles.container}>
            <p className={styles.blockHeading}>Last Block: {blockHeight}</p>
            <div className="text-3xl font-bold w-full text-center">Address(es):</div>
            {addresses.map(
                (address, index) => {
                    return (
                        <h3 className={styles.centered} key={index}>{address}</h3>
                    )
                }
            )}
            <div className="text-xl font-bold w-full text-center py-4">List Count: {getAssetCount(stateData) == 0 ? (<span>...</span>):(getAssetCount(stateData))}</div>
            <div className={styles.listInfo}>Assets owned by collection addresses are <span className={styles.highlightRow}>highlighted in green</span></div>
            <div className={styles.centered}>
                {sortFilterButtons(stateData, filtersApplied, filterHideNumericAssets, filterHideUnlocked, filterHideDivisible, filterHideSubassets)}
                <ShowFiltersApplied filtersApplied={filtersApplied} />
                <button id="clearFiltersButton" className={allFalse(filtersApplied) ? styles.hideButton:styles.formButton} onClick={() => clearFilters(stateData)}>Clear Filters</button>
                {DataTable(stateData, addresses, sortDataAscByKey, sortDataDescByKey, sortDataAscByKeyString, sortDataDescByKeyString)} 
            </div>
        </div>
    )


    
}

function getAssetCount(data){
    //filter out all elements with quantity == 0 and remove duplicate asset names
    const filteredData = data.filter((item) => {
        return item.quantity != 0
    }   
    )
    const uniqueAssets = [...new Set(filteredData.map(item => item.asset))]
    return uniqueAssets.length
}

   //get last element in array
function getLastElement(data) {
    const lastElement = data[data.length - 1]
    return lastElement
}

//check all object elements in array if any element.locked == 1
function checkLocked(data) {
    return data.some((item) => {
        return item.locked == 1
    })
}


function allFalse(obj) {
    return Object.values(obj).every((item) => {
        return item == false
    })
}

function ShowFiltersApplied({filtersApplied}) {

    return (
        <>
            {allFalse(filtersApplied) ? null : (
            <div className={styles.filtersApplied}>
                <div className="text-xl font-bold w-full text-center pb-2">Filters Applied:</div>
                {filtersApplied.hideSubassets ? <p>Hide Subassets</p> : null}
                {filtersApplied.hideUnlocked ? <p>Hide Unlocked</p> : null}
                {filtersApplied.hideDivisible ? <p>Hide Divisible</p> : null}
                {filtersApplied.hideNumericAssets ? <p>Hide Numeric Assets</p> : null}
            </div>
            )}
        </>
    )

}

function sortFilterButtons(stateData, filtersApplied, filterHideNumericAssets, filterHideUnlocked, filterHideDivisible, filterHideSubassets) {
    return <div className={styles.sortButtons}>
        <div>
            <button id="filterHideNumericAssetsButton" className={filtersApplied.hideNumericAssets ? styles.hideButton:styles.formButton} onClick={() => filterHideNumericAssets(stateData)}>Hide Numeric Assets</button>
            <button id="filterHideSubassetsButton" className={filtersApplied.hideSubassets ? styles.hideButton:styles.formButton} onClick={() => filterHideSubassets(stateData)}>Hide Subassets</button>
            <button id="filterHideUnlockedButton" className={filtersApplied.hideUnlocked ? styles.hideButton:styles.formButton} onClick={() => filterHideUnlocked(stateData)}>Hide Unlocked</button>
            <button id="filterHideDivisibleButton" className={filtersApplied.hideDivisible ? styles.hideButton:styles.formButton} onClick={() => filterHideDivisible(stateData)}>Hide Divisible</button>
        </div>
    </div>


}

function checkIfZeroQtyAndNotIssued(element, addresses) {
    //return true if qty == 0 and not issued by address in addresses array
    if(!element.issuances) return true

    //return element.quantity == 0 && !addresses.includes(getLastElement(element.issuances).issuer)
    return element.quantity == 0 && element.address != getLastElement(element.issuances).issuer
}



function DataTable(stateData, addresses, sortDataAscByKey, sortDataDescByKey, sortDataAscByKeyString, sortDataDescByKeyString) {

    const [sortingApplied, setSortingApplied] = useState({param: null, type: null})

    function handleHeaderElementClick(element, type) {

        if(sortingApplied.type == "desc" || sortingApplied.type == null) {

            if(type == "number") {
                sortDataAscByKey(stateData, element)
            } else if(type == "string") {
                sortDataAscByKeyString(stateData, element)
            }
            setSortingApplied({type: "asc", param: element})

        } else if(sortingApplied.type == "asc") {
                
            if(type == "number") {
                sortDataDescByKey(stateData, element)  
            } else if(type == "string") {
                sortDataDescByKeyString(stateData, element)
            }
            setSortingApplied({type: "desc", param: element})

        }
    }
    return <table className={styles.table}>
        <thead className={styles.stickyHeader}>
            <tr>
                <th className={styles.tableHeaderElement} onClick={() => handleHeaderElementClick("address", "string")}>Address {sortingApplied.param == "address" ? (sortingApplied.type == "asc" ? (<span>&#9650;</span>):(<span>&#9660;</span>)):(null)}</th>
                <th className={styles.tableHeaderElement} onClick={() => handleHeaderElementClick("assetForSorting", "string")}>Asset {sortingApplied.param == "assetForSorting" ? (sortingApplied.type == "asc" ? (<span>&#9650;</span>):(<span>&#9660;</span>)):(null)}</th>
                <th className={styles.tableHeaderElement} onClick={() => handleHeaderElementClick("description", "string")}>Description {sortingApplied.param == "description" ? (sortingApplied.type == "asc" ? (<span>&#9650;</span>):(<span>&#9660;</span>)):(null)}</th>
                <th className={styles.tableHeaderElement} onClick={() => handleHeaderElementClick("quantity", "number")}>Quantity {sortingApplied.param == "quantity" ? (sortingApplied.type == "asc" ? (<span>&#9650;</span>):(<span>&#9660;</span>)):(null)}</th>
                <th className={styles.tableHeaderElement} onClick={() => handleHeaderElementClick("supply", "number")}>Supply {sortingApplied.param == "supply" ? (sortingApplied.type == "asc" ? (<span>&#9650;</span>):(<span>&#9660;</span>)):(null)}</th>
                <th className={styles.tableHeaderElement} onClick={() => handleHeaderElementClick("divisible", "number")}>Divisible {sortingApplied.param == "divisible" ? (sortingApplied.type == "asc" ? (<span>&#9650;</span>):(<span>&#9660;</span>)):(null)}</th>
                <th className={styles.tableHeaderElement} onClick={() => handleHeaderElementClick("locked", "number")}>Locked {sortingApplied.param == "locked" ? (sortingApplied.type == "asc" ? (<span>&#9650;</span>):(<span>&#9660;</span>)):(null)}</th>
                <th className={styles.tableHeaderElement} onClick={() => handleHeaderElementClick("block_index", "number")}>Issuance Block {sortingApplied.param == "block_index" ? (sortingApplied.type == "asc" ? (<span>&#9650;</span>):(<span>&#9660;</span>)):(null)}</th>
                <th className={styles.tableHeaderElement} onClick={() => handleHeaderElementClick("issuer", "string")}>Asset Owner {sortingApplied.param == "issuer" ? (sortingApplied.type == "asc" ? (<span>&#9650;</span>):(<span>&#9660;</span>)):(null)}</th>
            </tr>
        </thead>
        <tbody>
            {stateData.map((item, index) => (
                !checkIfZeroQtyAndNotIssued(item, addresses) &&
                    <tr key={index} className={item.issuances ? (addresses.includes(getLastElement(item.issuances).issuer) ? styles.highlightRow : null) : null}>

                        <td className={styles.tableElement}>{item.address}</td>
                        <td className={styles.tableElement}>{item.assetForSorting}<div className={styles.smallLink}><a href={"https://xchain.io/asset/"+item.assetForSorting} target="_blank" rel="noreferrer">View on Xchain</a></div></td>
                        <td className={styles.tableElement}>{item.description}</td>
                        <td className={styles.tableElement}>{item.quantity}</td>
                        <td className={styles.tableElement}>{item.supply}</td>
                        <td className={styles.tableElement}>{item.divisible == 1 ? "true" : "false"}</td>
                        <td className={styles.tableElement}>{item.issuances ? (checkLocked(item.issuances) ? "true" : "false") : "..."}</td>
                        <td className={styles.tableElement}>{item.issuances ? (item.issuances[0].block_index) : "..."}</td>
                        <td className={styles.tableElement}>
                            {item.issuances ? (
                                <>
                                {getLastElement(item.issuances).issuer}
                                <div className={styles.smallLink}>
                                    <a href={`https://xchain.io/address/${getLastElement(item.issuances).issuer}`} target="_blank" rel="noreferrer">View on Xchain</a>
                                </div>
                                </>
                            ) : "..."}
                        </td>

                    </tr>
            ))}
        </tbody>
    </table>
}

