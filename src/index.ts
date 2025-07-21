import "dotenv/config";
import { Benchmark } from "./benchmark";
import { GeyserClient } from "./geyser";
import { DeezStreamClient } from "@deezstream/grpc-client";

if (!process.env.DEEZSTREAM_HOST_URL || !process.env.GEYSER_HOST_URL || !process.env.DEEZSTREAM_INCLUDE_ACCOUNTS) {
    console.error("Missing required environment variables. Please check your .env file.");
    process.exit(1);
}

// Helper to strip protocol from URL, as gRPC clients expect just the host and port
const stripProtocol = (url: string) => url.replace(/^(http|https):\/\//, '');

const DEEZSTREAM_HOST_URL = stripProtocol(process.env.DEEZSTREAM_HOST_URL);
const GEYSER_HOST_URL = process.env.GEYSER_HOST_URL; // Geyser client handles the protocol
const DEEZSTREAM_INCLUDE_ACCOUNTS = process.env.DEEZSTREAM_INCLUDE_ACCOUNTS.split(',');
const GEYSER_API_KEY = process.env.GEYSER_API_KEY;
const BENCHMARK_DURATION_SECONDS = parseInt(process.env.BENCHMARK_DURATION_SECONDS || '60', 10);

async function main() {
    const filters = {
        includeAccounts: DEEZSTREAM_INCLUDE_ACCOUNTS,
    };

    const deezStreamClient = new DeezStreamClient({ endpoint: DEEZSTREAM_HOST_URL });
    const geyserClient = new GeyserClient(GEYSER_HOST_URL, filters, GEYSER_API_KEY);

    console.log("Starting benchmark...");
    console.log(`Duration: ${BENCHMARK_DURATION_SECONDS} seconds`);
    console.log("Subscribing to accounts:", DEEZSTREAM_INCLUDE_ACCOUNTS);
    
    const benchmark = new Benchmark(geyserClient, deezStreamClient, filters);

    await benchmark.perform(BENCHMARK_DURATION_SECONDS);
    benchmark.printReport();
    process.exit(0);
}

main().catch(error => {
    console.error("Benchmark failed with an unexpected error:", error);
    process.exit(1);
});
