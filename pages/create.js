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
        <h1>Create Collection</h1>
          <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            Address:
            <input className={styles.formInputBox} type="text" value={address} onChange={e => setAddress(e.target.value)} />
          </label>
          <button className={styles.formButton} type="submit">Add Address</button>
          <button className={styles.formButton} onClick={() => setAddresses([])}>Clear Addresses</button>
        </form>
        <div className={styles.collectionAddressListContainer}>
        {addresses.map((address, index) => (
              <p className={styles.collectionAddressList} key={index}>{address}</p>
            ))}       
        </div>
        <button className={styles.formButton} onClick={() => handleGoToList(addresses)}>Go To Collection</button>
        
       
        </div>
        </div>
    )
}

export default HomePage