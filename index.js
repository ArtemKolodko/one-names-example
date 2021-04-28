const ENS = require("@ensdomains/ensjs").default;
const Web3 = require("web3");
const sha3 = require("web3-utils").sha3;
const utils = require("web3-utils");
const { hash } = require("eth-ens-namehash");
const BN = require("bn.js");
const EthRegistrarSubdomainRegistrar = require("./contracts/EthRegistrarSubdomainRegistrar");

const ENS_ADDRESS = "0xB750e4B49cf1b5162F7EfC964B3df5E9bfC893AD";
const NODE_URL = "https://api.s0.b.hmny.io";

const DOMAIN_NAME = "crazy";

const ETH_GAS_LIMIT = 6721900;
const HMY_USER_PRIVATE_KEY = "XXX";

const web3 = new Web3(NODE_URL);
// or init with Metamask / OneWallet
let hmyUserAccount = web3.eth.accounts.privateKeyToAccount(
  HMY_USER_PRIVATE_KEY
);
web3.eth.accounts.wallet.add(hmyUserAccount);
web3.eth.defaultAccount = hmyUserAccount.address;
hmyUserAccount = hmyUserAccount.address;

const provider = new Web3.providers.HttpProvider(NODE_URL);

const ens = new ENS({ provider, ensAddress: ENS_ADDRESS });

const test = async () => {
  console.log("");
  // check resolver address
  const resolverAddress = await ens.name("resolver.one").getAddress();
  console.log("resolver.one ", resolverAddress);

  const subdomainRegisterAddress = await ens.name("crazy.one").getAddress();

  const REFERRER_ADDRESS = await ens.name("crazy.one").getAddress();

  console.log(
    "subdomainRegisterAddress (crazy.one): ",
    subdomainRegisterAddress
  );

  console.log("");

  // init subdomainRegisterContract
  const subdomainRegistrar = new web3.eth.Contract(
    EthRegistrarSubdomainRegistrar.abi,
    subdomainRegisterAddress
  );

  const subdomain = "test-12345678913";
  const duration = 31536000; // 1 year

  //check subdomain to free
  let subdomainAddress = await ens.name(subdomain + ".crazy.one").getAddress();

  console.log("Check address to free: ", Number(subdomainAddress) === 0);

  // if 0x0 then free
  if (Number(subdomainAddress) !== 0) {
    return;
  }

  const rentPrice = await subdomainRegistrar.methods
    .rentPrice(subdomain, duration)
    .call();

  console.log(
    `rentPrice for "${subdomain}.crazy.one" to 1 year: `,
    Number(rentPrice) / 1e18,
    " ONE"
  );

  console.log(
    "User balance before: ",
    (await web3.eth.getBalance(hmyUserAccount)) / 1e18
  );
  console.log(
    "Referrer balance before: ",
    (await web3.eth.getBalance(REFERRER_ADDRESS)) / 1e18
  );

  console.log("");
  console.log("------- Start register: ", subdomain);
  console.log("");

  const tx = await subdomainRegistrar.methods
    .register(
      sha3(DOMAIN_NAME),
      subdomain,
      hmyUserAccount,
      duration,
      "twitter Name 12345",
      resolverAddress
    )
    .send({
      from: hmyUserAccount,
      value: utils.toBN(rentPrice),
      gas: ETH_GAS_LIMIT,
      gasPrice: new BN(await web3.eth.getGasPrice()).mul(new BN(1)),
    });

  console.log("TX STATUS: ", tx.status, tx.transactionHash);

  console.log("");
  console.log("-------------- CHECK SUBDOMAIN INFO ----------");
  console.log("");

  subdomainAddress = await ens.name(subdomain + ".crazy.one").getAddress();
  console.log(
    `Address: ${subdomain}.crazy.one`,
    subdomainAddress,
    subdomainAddress === hmyUserAccount
  );

  const subdomainOwner = await ens.name(subdomain + ".crazy.one").getOwner();
  console.log(
    `Owner: ${subdomain}.crazy.one`,
    subdomainOwner,
    subdomainOwner === hmyUserAccount
  );

  console.log(
    "Twitter name: ",
    await subdomainRegistrar.methods
      .twitter(hash(`${subdomain}.crazy.one`))
      .call()
  );

  console.log(
    "User balance after: ",
    (await web3.eth.getBalance(hmyUserAccount)) / 1e18
  );
  console.log(
    "Referrer balance after: ",
    (await web3.eth.getBalance(REFERRER_ADDRESS)) / 1e18
  );
};

test();
