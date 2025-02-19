/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  Contract,
  ContractFactory,
  ContractTransactionResponse,
  Interface,
} from "ethers";
import type {
  Signer,
  AddressLike,
  ContractDeployTransaction,
  ContractRunner,
} from "ethers";
import type { NonPayableOverrides } from "../../common";
import type {
  InsuranceCore,
  InsuranceCoreInterface,
} from "../../contracts/InsuranceCore";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_policyNFTAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_riskAssessmentAddress",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "OwnableInvalidOwner",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "OwnableUnauthorizedAccount",
    type: "error",
  },
  {
    inputs: [],
    name: "ReentrancyGuardReentrantCall",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "claimId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "ClaimPaid",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "claimId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "approved",
        type: "bool",
      },
    ],
    name: "ClaimProcessed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "claimId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "policyId",
        type: "uint256",
      },
    ],
    name: "ClaimSubmitted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "regPlate",
        type: "string",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "uploadDate",
        type: "uint256",
      },
    ],
    name: "PhotosUploaded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "policyId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "vehicleId",
        type: "string",
      },
    ],
    name: "PolicyCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "regPlate",
        type: "string",
      },
      {
        indexed: false,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: false,
        internalType: "enum IVehicleShield.VerificationTier",
        name: "tier",
        type: "uint8",
      },
    ],
    name: "VehicleRegistered",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "regPlate",
        type: "string",
      },
      {
        indexed: false,
        internalType: "enum InsuranceCore.VerificationStatus",
        name: "status",
        type: "uint8",
      },
    ],
    name: "VerificationStatusUpdated",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "claims",
    outputs: [
      {
        internalType: "uint256",
        name: "claimId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "policyId",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "description",
        type: "string",
      },
      {
        internalType: "string",
        name: "photoHash",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "isProcessed",
        type: "bool",
      },
      {
        internalType: "bool",
        name: "isPaid",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "enum IVehicleShield.VerificationTier",
        name: "",
        type: "uint8",
      },
    ],
    name: "coverageLimits",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "_regPlate",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "_duration",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_coverage",
        type: "uint256",
      },
    ],
    name: "createPolicy",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "policies",
    outputs: [
      {
        internalType: "uint256",
        name: "coverage",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "startDate",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "endDate",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "isActive",
        type: "bool",
      },
      {
        internalType: "enum IVehicleShield.VerificationTier",
        name: "tier",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "policyNFT",
    outputs: [
      {
        internalType: "contract IPolicyNFT",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_claimId",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "_approved",
        type: "bool",
      },
    ],
    name: "processClaim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "_regPlate",
        type: "string",
      },
      {
        internalType: "string",
        name: "_make",
        type: "string",
      },
      {
        internalType: "string",
        name: "_model",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "_year",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_baseValue",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_mileage",
        type: "uint256",
      },
      {
        internalType: "uint8",
        name: "_condition",
        type: "uint8",
      },
      {
        internalType: "bool",
        name: "_hasAccidentHistory",
        type: "bool",
      },
    ],
    name: "registerVehicle",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "riskAssessment",
    outputs: [
      {
        internalType: "contract IRiskAssessment",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_policyId",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "_description",
        type: "string",
      },
      {
        internalType: "string",
        name: "_photoHash",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "submitClaim",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "_regPlate",
        type: "string",
      },
      {
        internalType: "enum InsuranceCore.VerificationStatus",
        name: "_status",
        type: "uint8",
      },
    ],
    name: "updateVerificationStatus",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "_regPlate",
        type: "string",
      },
      {
        internalType: "string",
        name: "_frontHash",
        type: "string",
      },
      {
        internalType: "string",
        name: "_backHash",
        type: "string",
      },
      {
        internalType: "string",
        name: "_leftHash",
        type: "string",
      },
      {
        internalType: "string",
        name: "_rightHash",
        type: "string",
      },
      {
        internalType: "string",
        name: "_mirrorLeftHash",
        type: "string",
      },
      {
        internalType: "string",
        name: "_mirrorRightHash",
        type: "string",
      },
    ],
    name: "uploadVehiclePhotos",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    name: "vehiclePhotos",
    outputs: [
      {
        internalType: "string",
        name: "frontHash",
        type: "string",
      },
      {
        internalType: "string",
        name: "backHash",
        type: "string",
      },
      {
        internalType: "string",
        name: "leftHash",
        type: "string",
      },
      {
        internalType: "string",
        name: "rightHash",
        type: "string",
      },
      {
        internalType: "string",
        name: "mirrorLeftHash",
        type: "string",
      },
      {
        internalType: "string",
        name: "mirrorRightHash",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "uploadDate",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "isComplete",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    name: "vehicles",
    outputs: [
      {
        internalType: "string",
        name: "regPlate",
        type: "string",
      },
      {
        internalType: "string",
        name: "make",
        type: "string",
      },
      {
        internalType: "string",
        name: "model",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "year",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "enum InsuranceCore.VerificationStatus",
        name: "status",
        type: "uint8",
      },
      {
        internalType: "enum IVehicleShield.VerificationTier",
        name: "tier",
        type: "uint8",
      },
      {
        internalType: "uint256",
        name: "lastVerificationDate",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "isRegistered",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    stateMutability: "payable",
    type: "receive",
  },
] as const;

const _bytecode =
  "0x608060405260016009553480156200001657600080fd5b50604051620027f3380380620027f383398101604081905262000039916200019d565b600160005533806200006557604051631e4fbdf760e01b81526000600482015260240160405180910390fd5b62000070816200012e565b50600280546001600160a01b039384166001600160a01b03199182161782556003805493909416921691909117909155600860205266b1a2bc2ec500007f5eff886ea0ce6ca488a3d6e336d6c0f75f46d19b42c06ce5ee98e42c96d256c75567016345785d8a00007fad67d757c34507f157cacfa2e3153e9f260a2244f30428821be7be64587ac55f556000526702c68af0bb1400007f6add646517a5b0f6793cd5891b7937d28a5b2981a5d88ebc7cd776088fea904155620001d5565b600180546001600160a01b038381166001600160a01b0319831681179093556040519116919082907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b80516001600160a01b03811681146200019857600080fd5b919050565b60008060408385031215620001b157600080fd5b620001bc8362000180565b9150620001cc6020840162000180565b90509250929050565b61260e80620001e56000396000f3fe6080604052600436106100f75760003560e01c8063976de5c51161008a578063e93b2a3411610059578063e93b2a341461031e578063f21ad98b14610331578063f2fde38b14610351578063fedda0e41461037157600080fd5b8063976de5c514610237578063a888c2cd1461026c578063af02808a1461029f578063d3e89483146102bf57600080fd5b8063744007fd116100c6578063744007fd146101975780637daaaaf3146101cb5780638da5cb5b146101eb5780638f749e151461020957600080fd5b80631ca2cf281461010357806335446def1461012557806370a1a7d514610145578063715018a61461018257600080fd5b366100fe57005b600080fd5b34801561010f57600080fd5b5061012361011e366004611c52565b61039e565b005b34801561013157600080fd5b50610123610140366004611cb9565b610529565b34801561015157600080fd5b50600354610165906001600160a01b031681565b6040516001600160a01b0390911681526020015b60405180910390f35b34801561018e57600080fd5b506101236105f3565b3480156101a357600080fd5b506101b76101b2366004611ce5565b610607565b604051610179989796959493929190611d6a565b3480156101d757600080fd5b506101236101e6366004611dff565b610986565b3480156101f757600080fd5b506001546001600160a01b0316610165565b34801561021557600080fd5b50610229610224366004611f1a565b610bab565b604051908152602001610179565b34801561024357600080fd5b50610257610252366004611ce5565b610dcc565b60405161017999989796959493929190611fc3565b34801561027857600080fd5b5061028c610287366004612054565b610fcc565b604051610179979695949392919061206d565b3480156102ab57600080fd5b50600254610165906001600160a01b031681565b3480156102cb57600080fd5b5061030d6102da366004612054565b60066020526000908152604090208054600182015460028301546003909301549192909160ff8082169161010090041685565b6040516101799594939291906120c0565b61022961032c3660046120f6565b61111e565b34801561033d57600080fd5b5061012361034c366004612155565b6115a9565b34801561035d57600080fd5b5061012361036c366004612231565b6118bb565b34801561037d57600080fd5b5061022961038c36600461224e565b60086020526000908152604090205481565b6103a66118f9565b6004826040516103b6919061226b565b9081526040519081900360200190206006015460ff166104165760405162461bcd60e51b815260206004820152601660248201527515995a1a58db19481b9bdd081c9959da5cdd195c995960521b60448201526064015b60405180910390fd5b600582604051610426919061226b565b9081526040519081900360200190206007015460ff1661047e5760405162461bcd60e51b8152602060048201526013602482015272141a1bdd1bdcc81b9bdd081d5c1b1bd8591959606a1b604482015260640161040d565b8060048360405161048f919061226b565b908152604051908190036020019020600401805460ff60a01b1916600160a01b8360028111156104c1576104c1611f8f565b0217905550426004836040516104d7919061226b565b9081526020016040518091039020600501819055507f16199dc2004744f89cfe5bc916b084fff79f2e7be10b3a6be2240e97846fb408828260405161051d929190612287565b60405180910390a15050565b6105316118f9565b6000828152600760205260409020600581015460ff16156105945760405162461bcd60e51b815260206004820152601760248201527f436c61696d20616c72656164792070726f636573736564000000000000000000604482015260640161040d565b60058101805460ff1916600117905581156105b2576105b281611926565b827fd4203892740c26c8184cfb101077c87ccf2d01beaf6aef0c250ab43bb43df202836040516105e6911515815260200190565b60405180910390a2505050565b6105fb6118f9565b6106056000611b26565b565b805160208183018101805160058252928201919093012091528054819061062d906122b2565b80601f0160208091040260200160405190810160405280929190818152602001828054610659906122b2565b80156106a65780601f1061067b576101008083540402835291602001916106a6565b820191906000526020600020905b81548152906001019060200180831161068957829003601f168201915b5050505050908060010180546106bb906122b2565b80601f01602080910402602001604051908101604052809291908181526020018280546106e7906122b2565b80156107345780601f1061070957610100808354040283529160200191610734565b820191906000526020600020905b81548152906001019060200180831161071757829003601f168201915b505050505090806002018054610749906122b2565b80601f0160208091040260200160405190810160405280929190818152602001828054610775906122b2565b80156107c25780601f10610797576101008083540402835291602001916107c2565b820191906000526020600020905b8154815290600101906020018083116107a557829003601f168201915b5050505050908060030180546107d7906122b2565b80601f0160208091040260200160405190810160405280929190818152602001828054610803906122b2565b80156108505780601f1061082557610100808354040283529160200191610850565b820191906000526020600020905b81548152906001019060200180831161083357829003601f168201915b505050505090806004018054610865906122b2565b80601f0160208091040260200160405190810160405280929190818152602001828054610891906122b2565b80156108de5780601f106108b3576101008083540402835291602001916108de565b820191906000526020600020905b8154815290600101906020018083116108c157829003601f168201915b5050505050908060050180546108f3906122b2565b80601f016020809104026020016040519081016040528092919081815260200182805461091f906122b2565b801561096c5780601f106109415761010080835404028352916020019161096c565b820191906000526020600020905b81548152906001019060200180831161094f57829003601f168201915b50505050600683015460079093015491929160ff16905088565b336001600160a01b03166004886040516109a0919061226b565b908152604051908190036020019020600401546001600160a01b0316146109fd5760405162461bcd60e51b81526020600482015260116024820152702737ba103b32b434b1b6329037bbb732b960791b604482015260640161040d565b600587604051610a0d919061226b565b9081526040519081900360200190206007015460ff1615610a705760405162461bcd60e51b815260206004820152601760248201527f50686f746f7320616c72656164792075706c6f61646564000000000000000000604482015260640161040d565b60405180610100016040528087815260200186815260200185815260200184815260200183815260200182815260200142815260200160011515815250600588604051610abd919061226b565b90815260405190819003602001902081518190610ada908261233b565b5060208201516001820190610aef908261233b565b5060408201516002820190610b04908261233b565b5060608201516003820190610b19908261233b565b5060808201516004820190610b2e908261233b565b5060a08201516005820190610b43908261233b565b5060c0820151600682015560e0909101516007909101805460ff19169115159190911790556040517f1d11784494a8ce3357eaab9e9cf4439a22dd7b03aefaea16088e21e4bb2cfeac90610b9a90899042906123fb565b60405180910390a150505050505050565b6000610bb5611b78565b60008581526006602052604090206003015460ff16610c0a5760405162461bcd60e51b8152602060048201526011602482015270506f6c696379206e6f742061637469766560781b604482015260640161040d565b60025460405163ca00902160e01b81526004810187905233916001600160a01b03169063ca00902190602401602060405180830381865afa158015610c53573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610c77919061241d565b6001600160a01b031614610cc05760405162461bcd60e51b815260206004820152601060248201526f2737ba103837b634b1bc9037bbb732b960811b604482015260640161040d565b6009805460009182610cd183612450565b909155506040805160e08101825282815260208082018a81528284018a8152606084018a905260808401899052600060a0850181905260c0850181905286815260079093529390912082518155905160018201559151929350916002820190610d3a908261233b565b5060608201516003820190610d4f908261233b565b506080820151600482015560a08201516005909101805460c09093015115156101000261ff00199215159290921661ffff1990931692909217179055604051869082907f675e9cd1ef5a9bb6971c9f1099eced3c6607be0407bc871bc50a8a7b36832e7490600090a39050610dc46001600055565b949350505050565b8051602081830181018051600482529282019190930120915280548190610df2906122b2565b80601f0160208091040260200160405190810160405280929190818152602001828054610e1e906122b2565b8015610e6b5780601f10610e4057610100808354040283529160200191610e6b565b820191906000526020600020905b815481529060010190602001808311610e4e57829003601f168201915b505050505090806001018054610e80906122b2565b80601f0160208091040260200160405190810160405280929190818152602001828054610eac906122b2565b8015610ef95780601f10610ece57610100808354040283529160200191610ef9565b820191906000526020600020905b815481529060010190602001808311610edc57829003601f168201915b505050505090806002018054610f0e906122b2565b80601f0160208091040260200160405190810160405280929190818152602001828054610f3a906122b2565b8015610f875780601f10610f5c57610100808354040283529160200191610f87565b820191906000526020600020905b815481529060010190602001808311610f6a57829003601f168201915b505050600384015460048501546005860154600690960154949591946001600160a01b038216945060ff600160a01b830481169450600160a81b909204821692911689565b60076020526000908152604090208054600182015460028301805492939192610ff4906122b2565b80601f0160208091040260200160405190810160405280929190818152602001828054611020906122b2565b801561106d5780601f106110425761010080835404028352916020019161106d565b820191906000526020600020905b81548152906001019060200180831161105057829003601f168201915b505050505090806003018054611082906122b2565b80601f01602080910402602001604051908101604052809291908181526020018280546110ae906122b2565b80156110fb5780601f106110d0576101008083540402835291602001916110fb565b820191906000526020600020905b8154815290600101906020018083116110de57829003601f168201915b50505050600483015460059093015491929160ff80821692506101009091041687565b6000611128611b78565b600060048560405161113a919061226b565b908152604051908190036020019020600681015490915060ff166111995760405162461bcd60e51b815260206004820152601660248201527515995a1a58db19481b9bdd081c9959da5cdd195c995960521b604482015260640161040d565b60048101546001600160a01b031633146111e95760405162461bcd60e51b81526020600482015260116024820152702737ba103b32b434b1b6329037bbb732b960791b604482015260640161040d565b60016004820154600160a01b900460ff16600281111561120b5761120b611f8f565b1461124f5760405162461bcd60e51b815260206004820152601460248201527315995a1a58db19481b9bdd081d995c9a599a595960621b604482015260640161040d565b6004810154600890600090600160a81b900460ff16600281111561127557611275611f8f565b600281111561128657611286611f8f565b8152602001908152602001600020548311156112e45760405162461bcd60e51b815260206004820152601b60248201527f436f76657261676520657863656564732074696572206c696d69740000000000604482015260640161040d565b600354600482810154604051631a709f8560e21b81526000936001600160a01b0316926369c27e1492611325928b92600160a81b90920460ff169101612287565b602060405180830381865afa158015611342573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906113669190612469565b9050803410156113b85760405162461bcd60e51b815260206004820152601c60248201527f496e73756666696369656e74207072656d69756d207061796d656e7400000000604482015260640161040d565b600085116113fb5760405162461bcd60e51b815260206004820152601060248201526f24b73b30b634b210323ab930ba34b7b760811b604482015260640161040d565b60025460048381015460405163043537fd60e31b81526000936001600160a01b0316926321a9bfe8926114419233928d92600160a81b900460ff169189918d9101612482565b6020604051808303816000875af1158015611460573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906114849190612469565b90506040518060a0016040528086815260200142815260200187426114a991906124cd565b8152600160208201526004850154604090910190600160a81b900460ff1660028111156114d8576114d8611f8f565b90526000828152600660209081526040918290208351815590830151600182015590820151600280830191909155606083015160038301805491151560ff19831681178255608086015193919261ff001990911661ffff19909116179061010090849081111561154a5761154a611f8f565b0217905550905050336001600160a01b0316817f21d0178f0cde2aed24022db30651dabafb4bbe431fb787fbc92113304d8e35498960405161158c91906124e6565b60405180910390a3925050506115a26001600055565b9392505050565b6004886040516115b9919061226b565b9081526040519081900360200190206006015460ff161561161c5760405162461bcd60e51b815260206004820152601a60248201527f56656869636c6520616c72656164792072656769737465726564000000000000604482015260640161040d565b61162a6301e13380426124f9565b611636906107b26124cd565b8511156116745760405162461bcd60e51b815260206004820152600c60248201526b24b73b30b634b2103cb2b0b960a11b604482015260640161040d565b6003546000906001600160a01b0316630944a8ca8a87896116996301e13380426124f9565b6116a5906107b26124cd565b6116af919061251b565b8888886040518763ffffffff1660e01b81526004016116d39695949392919061252e565b60408051808303816000875af11580156116f1573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190611715919061256f565b5060408051610120810182528b8152602081018b90529081018990526060810188905233608082015290915060a081016000815260200182600281111561175e5761175e611f8f565b815242602082015260016040918201525160049061177d908c9061226b565b9081526040519081900360200190208151819061179a908261233b565b50602082015160018201906117af908261233b565b50604082015160028201906117c4908261233b565b506060820151600382015560808201516004820180546001600160a01b039092166001600160a01b031983168117825560a0850151926001600160a81b03191617600160a01b83600281111561181c5761181c611f8f565b021790555060c082015160048201805460ff60a81b1916600160a81b83600281111561184a5761184a611f8f565b021790555060e08201516005820155610100909101516006909101805460ff19169115159190911790556040517fac60a133922621409c80ab6958b2718dc64d275887639e7694b2aa0d87cbcb02906118a8908b903390859061259d565b60405180910390a1505050505050505050565b6118c36118f9565b6001600160a01b0381166118ed57604051631e4fbdf760e01b81526000600482015260240161040d565b6118f681611b26565b50565b6001546001600160a01b031633146106055760405163118cdaa760e01b815233600482015260240161040d565b6005810154610100900460ff16156119755760405162461bcd60e51b815260206004820152601260248201527110db185a5b48185b1c9958591e481c185a5960721b604482015260640161040d565b80600401544710156119c95760405162461bcd60e51b815260206004820152601d60248201527f496e73756666696369656e7420636f6e74726163742062616c616e6365000000604482015260640161040d565b600254600182015460405163ca00902160e01b815260048101919091526000916001600160a01b03169063ca00902190602401602060405180830381865afa158015611a19573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190611a3d919061241d565b60058301805461ff00191661010017905560048301546040519192506000916001600160a01b03841691908381818185875af1925050503d8060008114611aa0576040519150601f19603f3d011682016040523d82523d6000602084013e611aa5565b606091505b5050905080611aef5760405162461bcd60e51b815260206004820152601660248201527511985a5b1959081d1bc81cd95b99081c185e5b595b9d60521b604482015260640161040d565b825460048401546040519081527fb0727183796e52c5bb00a257c1eb36d8e94dbee5d6d87e259287e3372ae39ace906020016105e6565b600180546001600160a01b038381166001600160a01b0319831681179093556040519116919082907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b600260005403611b9b57604051633ee5aeb560e01b815260040160405180910390fd5b6002600055565b634e487b7160e01b600052604160045260246000fd5b600082601f830112611bc957600080fd5b813567ffffffffffffffff80821115611be457611be4611ba2565b604051601f8301601f19908116603f01168101908282118183101715611c0c57611c0c611ba2565b81604052838152866020858801011115611c2557600080fd5b836020870160208301376000602085830101528094505050505092915050565b600381106118f657600080fd5b60008060408385031215611c6557600080fd5b823567ffffffffffffffff811115611c7c57600080fd5b611c8885828601611bb8565b9250506020830135611c9981611c45565b809150509250929050565b80358015158114611cb457600080fd5b919050565b60008060408385031215611ccc57600080fd5b82359150611cdc60208401611ca4565b90509250929050565b600060208284031215611cf757600080fd5b813567ffffffffffffffff811115611d0e57600080fd5b610dc484828501611bb8565b60005b83811015611d35578181015183820152602001611d1d565b50506000910152565b60008151808452611d56816020860160208601611d1a565b601f01601f19169290920160200192915050565b6000610100808352611d7e8184018c611d3e565b90508281036020840152611d92818b611d3e565b90508281036040840152611da6818a611d3e565b90508281036060840152611dba8189611d3e565b90508281036080840152611dce8188611d3e565b905082810360a0840152611de28187611d3e565b60c0840195909552505090151560e0909101529695505050505050565b600080600080600080600060e0888a031215611e1a57600080fd5b873567ffffffffffffffff80821115611e3257600080fd5b611e3e8b838c01611bb8565b985060208a0135915080821115611e5457600080fd5b611e608b838c01611bb8565b975060408a0135915080821115611e7657600080fd5b611e828b838c01611bb8565b965060608a0135915080821115611e9857600080fd5b611ea48b838c01611bb8565b955060808a0135915080821115611eba57600080fd5b611ec68b838c01611bb8565b945060a08a0135915080821115611edc57600080fd5b611ee88b838c01611bb8565b935060c08a0135915080821115611efe57600080fd5b50611f0b8a828b01611bb8565b91505092959891949750929550565b60008060008060808587031215611f3057600080fd5b84359350602085013567ffffffffffffffff80821115611f4f57600080fd5b611f5b88838901611bb8565b94506040870135915080821115611f7157600080fd5b50611f7e87828801611bb8565b949793965093946060013593505050565b634e487b7160e01b600052602160045260246000fd5b600381106118f657634e487b7160e01b600052602160045260246000fd5b6000610120808352611fd78184018d611d3e565b90508281036020840152611feb818c611d3e565b90508281036040840152611fff818b611d3e565b606084018a90526001600160a01b03891660808501529150612022905086611fa5565b8560a083015261203185611fa5565b8460c08301528360e08301528215156101008301529a9950505050505050505050565b60006020828403121561206657600080fd5b5035919050565b87815286602082015260e06040820152600061208c60e0830188611d3e565b828103606084015261209e8188611d3e565b6080840196909652505091151560a0830152151560c090910152949350505050565b8581526020810185905260408101849052821515606082015260a081016120e683611fa5565b8260808301529695505050505050565b60008060006060848603121561210b57600080fd5b833567ffffffffffffffff81111561212257600080fd5b61212e86828701611bb8565b9660208601359650604090950135949350505050565b803560ff81168114611cb457600080fd5b600080600080600080600080610100898b03121561217257600080fd5b883567ffffffffffffffff8082111561218a57600080fd5b6121968c838d01611bb8565b995060208b01359150808211156121ac57600080fd5b6121b88c838d01611bb8565b985060408b01359150808211156121ce57600080fd5b506121db8b828c01611bb8565b965050606089013594506080890135935060a089013592506121ff60c08a01612144565b915061220d60e08a01611ca4565b90509295985092959890939650565b6001600160a01b03811681146118f657600080fd5b60006020828403121561224357600080fd5b81356115a28161221c565b60006020828403121561226057600080fd5b81356115a281611c45565b6000825161227d818460208701611d1a565b9190910192915050565b60408152600061229a6040830185611d3e565b90506122a583611fa5565b8260208301529392505050565b600181811c908216806122c657607f821691505b6020821081036122e657634e487b7160e01b600052602260045260246000fd5b50919050565b601f82111561233657600081815260208120601f850160051c810160208610156123135750805b601f850160051c820191505b818110156123325782815560010161231f565b5050505b505050565b815167ffffffffffffffff81111561235557612355611ba2565b6123698161236384546122b2565b846122ec565b602080601f83116001811461239e57600084156123865750858301515b600019600386901b1c1916600185901b178555612332565b600085815260208120601f198616915b828110156123cd578886015182559484019460019091019084016123ae565b50858210156123eb5787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b60408152600061240e6040830185611d3e565b90508260208301529392505050565b60006020828403121561242f57600080fd5b81516115a28161221c565b634e487b7160e01b600052601160045260246000fd5b6000600182016124625761246261243a565b5060010190565b60006020828403121561247b57600080fd5b5051919050565b6001600160a01b038616815260a0602082018190526000906124a690830187611d3e565b90506124b185611fa5565b8460408301528360608301528260808301529695505050505050565b808201808211156124e0576124e061243a565b92915050565b6020815260006115a26020830184611d3e565b60008261251657634e487b7160e01b600052601260045260246000fd5b500490565b818103818111156124e0576124e061243a565b60c08152600061254160c0830189611d3e565b6020830197909752506040810194909452606084019290925260ff166080830152151560a090910152919050565b6000806040838503121561258257600080fd5b825161258d81611c45565b6020939093015192949293505050565b6060815260006125b06060830186611d3e565b6001600160a01b038516602084015290506125ca83611fa5565b82604083015294935050505056fea2646970667358221220a3a99baa042596d6d30896994f1298744feec4f3087b3dc33b602c9844a578a764736f6c63430008140033";

type InsuranceCoreConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: InsuranceCoreConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class InsuranceCore__factory extends ContractFactory {
  constructor(...args: InsuranceCoreConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override getDeployTransaction(
    _policyNFTAddress: AddressLike,
    _riskAssessmentAddress: AddressLike,
    overrides?: NonPayableOverrides & { from?: string }
  ): Promise<ContractDeployTransaction> {
    return super.getDeployTransaction(
      _policyNFTAddress,
      _riskAssessmentAddress,
      overrides || {}
    );
  }
  override deploy(
    _policyNFTAddress: AddressLike,
    _riskAssessmentAddress: AddressLike,
    overrides?: NonPayableOverrides & { from?: string }
  ) {
    return super.deploy(
      _policyNFTAddress,
      _riskAssessmentAddress,
      overrides || {}
    ) as Promise<
      InsuranceCore & {
        deploymentTransaction(): ContractTransactionResponse;
      }
    >;
  }
  override connect(runner: ContractRunner | null): InsuranceCore__factory {
    return super.connect(runner) as InsuranceCore__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): InsuranceCoreInterface {
    return new Interface(_abi) as InsuranceCoreInterface;
  }
  static connect(
    address: string,
    runner?: ContractRunner | null
  ): InsuranceCore {
    return new Contract(address, _abi, runner) as unknown as InsuranceCore;
  }
}
