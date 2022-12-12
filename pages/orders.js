import React from 'react';

const Orderbook = () => {
  return (
    <div className="row">
      <div className="col-sm-6">
        <div className="p-4">
          <div className="page-header">
            <h3>Sell Orders</h3>
          </div>
          <div>
            <table className="table-auto">
              <thead>
                <tr>
                  <th className="px-4 py-2">
                    <span className="cardOrderbook-pair"></span>
                    <br />
                    <span className="text-xs text-gray-500">Price Each</span>
                  </th>
                  <th className="px-4 py-2">
                    <span className="cardOrderbook-assetname"></span>
                    <br />
                    <span className="text-xs text-gray-500">Amount</span>
                  </th>
                </tr>
              </thead>
              <tbody id="sellOrders"></tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="col-sm-6">
        <div className="p-4">
          <div className="page-header">
            <h3>Buy Orders</h3>
          </div>
          <div>
            <table className="table-auto">
              <thead>
                <tr>
                  <th className="px-4 py-2">
                    <span className="cardOrderbook-pair"></span>
                    <br />
                    <span className="text-xs text-gray-500">Price Each</span>
                  </th>
                  <th className="px-4 py-2">
                    <span className="cardOrderbook-assetname"></span>
                    <br />
                    <span className="text-xs text-gray-500">Amount</span>
                  </th>
                </tr>
              </thead>
              <tbody id="buyOrders"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Orderbook;