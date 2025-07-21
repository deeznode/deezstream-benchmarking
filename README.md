# DeezStream vs. Geyser Benchmark

This tool benchmarks a standard Geyser gRPC service (using `@triton-one/yellowstone-grpc`) against a DeezStream gRPC service.

## Getting Started

### Prerequisites

-   Git for cloning the repository
-   Node.js (v18 or newer recommended)

### Usage

1.  **Clone the repository**
    ```bash
    git clone https://github.com/deeznode/deezstream-benchmarking.git
    cd deezstream-benchmarking
    ```

2.  **Install dependencies**
    This command will install all necessary packages and link the local `@deezstream/grpc-client` library.
    ```bash
    npm install
    ```

3.  **Configure the project**
    Copy the `.env-example` file to a new file named `.env`:
    ```bash
    cp .env-example .env
    ```
    Then, open the `.env` file and fill in the following variables:
    -   `GEYSER_HOST_URL`: Your Geyser provider's gRPC host URL.
    -   `GEYSER_API_KEY`: (Optional) Your Geyser provider's API key. If not required, leave it blank.
    -   `DEEZSTREAM_HOST_URL`: The host URL for your DeezStream service.
    -   `DEEZSTREAM_INCLUDE_ACCOUNTS`: **(Required)** A comma-separated list of Solana account addresses to subscribe to. Both services will use this filter.
    -   `BENCHMARK_DURATION_SECONDS`: The duration of the benchmark in seconds (e.g., `60`).

4.  **Run the script**
    ```bash
    npm start
    ```

## Output Example

During the run, you will see a log for each transaction that is successfully received and matched from both services. At the end of the benchmark, a final performance report will be printed:

```
Transaction matched: 2zFfP7cW8SgN4g2Y8Xv6a...
Transaction matched: 5hT1cR9bV2fE4gH7kLwJp...
...

⏱️ --- Performance Analysis (on matched transactions) ---

🏆 Winner: DeezStream
DeezStream was FASTER than Geyser by an average of 12.68 milliseconds.

- DeezStream was first on 90.00% of transactions.
- Geyser was first on 10.00% of transactions.

===============================================
```
