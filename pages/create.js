import Head from 'next/head'
import styles from '../styles/Home.module.css'

import React, { useState } from 'react';
import { useRouter } from 'next/router'




function HomePage() {

    const router = useRouter()

const [address, setAddress] = useState('');
const [addresses, setAddresses] = useState([]);

function handleSubmit(e) {
  e.preventDefault();
  setAddresses([...addresses, address]);
  setAddress('');
}

function handleGoToList(addresses){

  const addressesString = addresses.join(',')

  router.push({
    pathname: '/list',
    query: { address: addressesString },
  })
}

    
  return (
    <div className={styles.container}>
         <div className={styles.main}>
        <h1 className="text-3xl font-bold">Create Collection</h1>
        <div className="w-full max-w-xl">
          <form onSubmit={handleSubmit}>
            <div className="m-2">
          <label>
            Address:
            <input className="w-full rounded-md border-2 border-gray-300 px-5 py-3 placeholder-gray-500 focus:border-indigo-500 focus:ring-indigo-500 sm:max-w-xl" type="text" value={address} onChange={e => setAddress(e.target.value)} />
          </label>
          </div>
          <div className="text-center">
          <button className={styles.formButton} type="submit">Add Address</button>
          <button className={styles.formButton} onClick={() => setAddresses([])}>Clear Addresses</button>
          </div>
        </form>
        </div>
        <div className={styles.collectionAddressListContainer}>
        {addresses.map((address, index) => (
              <p className={styles.collectionAddressList} key={index}>{address}</p>
            ))}       
        </div>
        {addresses.length > 0 && <button className={styles.formButton} onClick={() => handleGoToList(addresses)}>Go To Collection</button>}
        </div>
        </div>
    )
}

export default HomePage