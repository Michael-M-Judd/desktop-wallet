/* eslint-disable */

import StellarSdk, {Config} from 'stellar-sdk';
import axios from 'axios';
import Store from 'electron-store';

//Horizon API Setup
Config.setAllowHttp(true);
const BASE_URL_TEST_NET = 'http://ec2-18-219-131-250.us-east-2.compute.amazonaws.com/';
const BASE_URL_HORIZON_TEST_NET = 'https://horizon-testnet.stellar.org';
const BASE_URL = BASE_URL_TEST_NET;
const server = new StellarSdk.Server(BASE_URL);

//Persistent Setup
const store = new Store();
const USER_PUBLIC_KEYS = 'userAccountKeys';
var userAccountKeys = [];

export function createSeed(success) {
    

    const pair = StellarSdk.Keypair.random();
    let secretKey = pair.secret();
    let publicKey = pair.publicKey();
    userAccountKeys.push(publicKey);
    store.set(USER_PUBLIC_KEYS, userAccountKeys);
    console.log(`Secret: ${secretKey}  || Public: ${publicKey}`);
    success(publicKey);
}

export function createTestAccount(publicKey, success, failure) {
  //Friend Bot is only on Horizon Test Net
  const request = axios.get(`${BASE_URL_HORIZON_TEST_NET}/friendbot?addr=${publicKey}`)
    .then(response => {
      console.log('Success: ' + response);
      success(response);
    })
    .catch(error => {
      failure('Network call failed');
    });
}

export function getAccountDetail(publicKey, success) {
    server.loadAccount(publicKey)
    .then(account => {
        console.log('Balances for account: ' + publicKey);
        account.balances.forEach(function(balance) {
          console.log('Type:', balance.asset_type, ', Balance:', balance.balance);
          success(balance);
        });
    });
}