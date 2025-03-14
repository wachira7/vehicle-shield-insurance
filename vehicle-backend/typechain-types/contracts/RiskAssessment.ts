/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumberish,
  BytesLike,
  FunctionFragment,
  Result,
  Interface,
  EventFragment,
  AddressLike,
  ContractRunner,
  ContractMethod,
  Listener,
} from "ethers";
import type {
  TypedContractEvent,
  TypedDeferredTopicFilter,
  TypedEventLog,
  TypedLogDescription,
  TypedListener,
  TypedContractMethod,
} from "../common";

export declare namespace RiskAssessment {
  export type VehicleRiskStruct = {
    baseValue: BigNumberish;
    age: BigNumberish;
    mileage: BigNumberish;
    condition: BigNumberish;
    riskScore: BigNumberish;
    hasAccidentHistory: boolean;
    lastAssessment: BigNumberish;
  };

  export type VehicleRiskStructOutput = [
    baseValue: bigint,
    age: bigint,
    mileage: bigint,
    condition: bigint,
    riskScore: bigint,
    hasAccidentHistory: boolean,
    lastAssessment: bigint
  ] & {
    baseValue: bigint;
    age: bigint;
    mileage: bigint;
    condition: bigint;
    riskScore: bigint;
    hasAccidentHistory: boolean;
    lastAssessment: bigint;
  };
}

export interface RiskAssessmentInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "assessVehicle"
      | "calculatePremium"
      | "calculateRiskScore"
      | "determineTier"
      | "getVehicleRisk"
      | "owner"
      | "renounceOwnership"
      | "tierPremiums"
      | "transferOwnership"
      | "updatePremiumFactors"
      | "vehicleRisks"
  ): FunctionFragment;

  getEvent(
    nameOrSignatureOrTopic: "OwnershipTransferred" | "RiskAssessed"
  ): EventFragment;

  encodeFunctionData(
    functionFragment: "assessVehicle",
    values: [
      string,
      BigNumberish,
      BigNumberish,
      BigNumberish,
      BigNumberish,
      boolean
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "calculatePremium",
    values: [string, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "calculateRiskScore",
    values: [BigNumberish, BigNumberish, BigNumberish, boolean]
  ): string;
  encodeFunctionData(
    functionFragment: "determineTier",
    values: [BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "getVehicleRisk",
    values: [string]
  ): string;
  encodeFunctionData(functionFragment: "owner", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "renounceOwnership",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "tierPremiums",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "transferOwnership",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "updatePremiumFactors",
    values: [
      BigNumberish,
      BigNumberish,
      BigNumberish,
      BigNumberish,
      BigNumberish
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "vehicleRisks",
    values: [string]
  ): string;

  decodeFunctionResult(
    functionFragment: "assessVehicle",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "calculatePremium",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "calculateRiskScore",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "determineTier",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getVehicleRisk",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "owner", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "renounceOwnership",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "tierPremiums",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "transferOwnership",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "updatePremiumFactors",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "vehicleRisks",
    data: BytesLike
  ): Result;
}

export namespace OwnershipTransferredEvent {
  export type InputTuple = [previousOwner: AddressLike, newOwner: AddressLike];
  export type OutputTuple = [previousOwner: string, newOwner: string];
  export interface OutputObject {
    previousOwner: string;
    newOwner: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace RiskAssessedEvent {
  export type InputTuple = [
    regPlate: string,
    riskScore: BigNumberish,
    tier: BigNumberish
  ];
  export type OutputTuple = [regPlate: string, riskScore: bigint, tier: bigint];
  export interface OutputObject {
    regPlate: string;
    riskScore: bigint;
    tier: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export interface RiskAssessment extends BaseContract {
  connect(runner?: ContractRunner | null): RiskAssessment;
  waitForDeployment(): Promise<this>;

  interface: RiskAssessmentInterface;

  queryFilter<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;
  queryFilter<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;

  on<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  on<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  once<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  once<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  listeners<TCEvent extends TypedContractEvent>(
    event: TCEvent
  ): Promise<Array<TypedListener<TCEvent>>>;
  listeners(eventName?: string): Promise<Array<Listener>>;
  removeAllListeners<TCEvent extends TypedContractEvent>(
    event?: TCEvent
  ): Promise<this>;

  assessVehicle: TypedContractMethod<
    [
      _regPlate: string,
      _baseValue: BigNumberish,
      _age: BigNumberish,
      _mileage: BigNumberish,
      _condition: BigNumberish,
      _hasAccidentHistory: boolean
    ],
    [[bigint, bigint]],
    "nonpayable"
  >;

  calculatePremium: TypedContractMethod<
    [_regPlate: string, _tier: BigNumberish],
    [bigint],
    "view"
  >;

  calculateRiskScore: TypedContractMethod<
    [
      _age: BigNumberish,
      _mileage: BigNumberish,
      _condition: BigNumberish,
      _hasAccidentHistory: boolean
    ],
    [bigint],
    "view"
  >;

  determineTier: TypedContractMethod<
    [_baseValue: BigNumberish, _riskScore: BigNumberish],
    [bigint],
    "view"
  >;

  getVehicleRisk: TypedContractMethod<
    [_regPlate: string],
    [RiskAssessment.VehicleRiskStructOutput],
    "view"
  >;

  owner: TypedContractMethod<[], [string], "view">;

  renounceOwnership: TypedContractMethod<[], [void], "nonpayable">;

  tierPremiums: TypedContractMethod<
    [arg0: BigNumberish],
    [
      [bigint, bigint, bigint, bigint] & {
        baseRate: bigint;
        ageMultiplier: bigint;
        conditionMultiplier: bigint;
        accidentPenalty: bigint;
      }
    ],
    "view"
  >;

  transferOwnership: TypedContractMethod<
    [newOwner: AddressLike],
    [void],
    "nonpayable"
  >;

  updatePremiumFactors: TypedContractMethod<
    [
      _tier: BigNumberish,
      _baseRate: BigNumberish,
      _ageMultiplier: BigNumberish,
      _conditionMultiplier: BigNumberish,
      _accidentPenalty: BigNumberish
    ],
    [void],
    "nonpayable"
  >;

  vehicleRisks: TypedContractMethod<
    [arg0: string],
    [
      [bigint, bigint, bigint, bigint, bigint, boolean, bigint] & {
        baseValue: bigint;
        age: bigint;
        mileage: bigint;
        condition: bigint;
        riskScore: bigint;
        hasAccidentHistory: boolean;
        lastAssessment: bigint;
      }
    ],
    "view"
  >;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "assessVehicle"
  ): TypedContractMethod<
    [
      _regPlate: string,
      _baseValue: BigNumberish,
      _age: BigNumberish,
      _mileage: BigNumberish,
      _condition: BigNumberish,
      _hasAccidentHistory: boolean
    ],
    [[bigint, bigint]],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "calculatePremium"
  ): TypedContractMethod<
    [_regPlate: string, _tier: BigNumberish],
    [bigint],
    "view"
  >;
  getFunction(
    nameOrSignature: "calculateRiskScore"
  ): TypedContractMethod<
    [
      _age: BigNumberish,
      _mileage: BigNumberish,
      _condition: BigNumberish,
      _hasAccidentHistory: boolean
    ],
    [bigint],
    "view"
  >;
  getFunction(
    nameOrSignature: "determineTier"
  ): TypedContractMethod<
    [_baseValue: BigNumberish, _riskScore: BigNumberish],
    [bigint],
    "view"
  >;
  getFunction(
    nameOrSignature: "getVehicleRisk"
  ): TypedContractMethod<
    [_regPlate: string],
    [RiskAssessment.VehicleRiskStructOutput],
    "view"
  >;
  getFunction(
    nameOrSignature: "owner"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "renounceOwnership"
  ): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "tierPremiums"
  ): TypedContractMethod<
    [arg0: BigNumberish],
    [
      [bigint, bigint, bigint, bigint] & {
        baseRate: bigint;
        ageMultiplier: bigint;
        conditionMultiplier: bigint;
        accidentPenalty: bigint;
      }
    ],
    "view"
  >;
  getFunction(
    nameOrSignature: "transferOwnership"
  ): TypedContractMethod<[newOwner: AddressLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "updatePremiumFactors"
  ): TypedContractMethod<
    [
      _tier: BigNumberish,
      _baseRate: BigNumberish,
      _ageMultiplier: BigNumberish,
      _conditionMultiplier: BigNumberish,
      _accidentPenalty: BigNumberish
    ],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "vehicleRisks"
  ): TypedContractMethod<
    [arg0: string],
    [
      [bigint, bigint, bigint, bigint, bigint, boolean, bigint] & {
        baseValue: bigint;
        age: bigint;
        mileage: bigint;
        condition: bigint;
        riskScore: bigint;
        hasAccidentHistory: boolean;
        lastAssessment: bigint;
      }
    ],
    "view"
  >;

  getEvent(
    key: "OwnershipTransferred"
  ): TypedContractEvent<
    OwnershipTransferredEvent.InputTuple,
    OwnershipTransferredEvent.OutputTuple,
    OwnershipTransferredEvent.OutputObject
  >;
  getEvent(
    key: "RiskAssessed"
  ): TypedContractEvent<
    RiskAssessedEvent.InputTuple,
    RiskAssessedEvent.OutputTuple,
    RiskAssessedEvent.OutputObject
  >;

  filters: {
    "OwnershipTransferred(address,address)": TypedContractEvent<
      OwnershipTransferredEvent.InputTuple,
      OwnershipTransferredEvent.OutputTuple,
      OwnershipTransferredEvent.OutputObject
    >;
    OwnershipTransferred: TypedContractEvent<
      OwnershipTransferredEvent.InputTuple,
      OwnershipTransferredEvent.OutputTuple,
      OwnershipTransferredEvent.OutputObject
    >;

    "RiskAssessed(string,uint8,uint8)": TypedContractEvent<
      RiskAssessedEvent.InputTuple,
      RiskAssessedEvent.OutputTuple,
      RiskAssessedEvent.OutputObject
    >;
    RiskAssessed: TypedContractEvent<
      RiskAssessedEvent.InputTuple,
      RiskAssessedEvent.OutputTuple,
      RiskAssessedEvent.OutputObject
    >;
  };
}
