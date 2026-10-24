// The network VehicleShield runs on. Kept apart from the wallet adapter (lib/wallet.ts) so
// pages can use it without pulling the adapter into their bundle.
import { sepolia } from "@reown/appkit/networks";

export const chain = sepolia;
