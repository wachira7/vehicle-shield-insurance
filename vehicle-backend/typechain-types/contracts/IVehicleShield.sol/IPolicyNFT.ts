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
  AddressLike,
  ContractRunner,
  ContractMethod,
  Listener,
} from "ethers";
import type {
  TypedContractEvent,
  TypedDeferredTopicFilter,
  TypedEventLog,
  TypedListener,
  TypedContractMethod,
} from "../../common";

export interface IPolicyNFTInterface extends Interface {
  getFunction(
    nameOrSignature: "burnPolicy" | "getPolicyOwner" | "mintPolicy"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "burnPolicy",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "getPolicyOwner",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "mintPolicy",
    values: [AddressLike, string, BigNumberish, BigNumberish, BigNumberish]
  ): string;

  decodeFunctionResult(functionFragment: "burnPolicy", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "getPolicyOwner",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "mintPolicy", data: BytesLike): Result;
}

export interface IPolicyNFT extends BaseContract {
  connect(runner?: ContractRunner | null): IPolicyNFT;
  waitForDeployment(): Promise<this>;

  interface: IPolicyNFTInterface;

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

  burnPolicy: TypedContractMethod<
    [policyId: BigNumberish],
    [void],
    "nonpayable"
  >;

  getPolicyOwner: TypedContractMethod<
    [policyId: BigNumberish],
    [string],
    "view"
  >;

  mintPolicy: TypedContractMethod<
    [
      to: AddressLike,
      vehicleId: string,
      tier: BigNumberish,
      premium: BigNumberish,
      coverage: BigNumberish
    ],
    [bigint],
    "nonpayable"
  >;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "burnPolicy"
  ): TypedContractMethod<[policyId: BigNumberish], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "getPolicyOwner"
  ): TypedContractMethod<[policyId: BigNumberish], [string], "view">;
  getFunction(
    nameOrSignature: "mintPolicy"
  ): TypedContractMethod<
    [
      to: AddressLike,
      vehicleId: string,
      tier: BigNumberish,
      premium: BigNumberish,
      coverage: BigNumberish
    ],
    [bigint],
    "nonpayable"
  >;

  filters: {};
}
