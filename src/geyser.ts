import Client, {
  CommitmentLevel,
  SubscribeRequest,
  SubscribeUpdate,
  SubscribeUpdateTransaction,
} from "@triton-one/yellowstone-grpc";
import { ClientDuplexStream } from "@grpc/grpc-js";
import { SubscribeOptions } from "@deezstream/grpc-client";

type OnTransactionCallback = (data: SubscribeUpdateTransaction) => void;

export class GeyserClient {
  private client: Client;
  private stream?: ClientDuplexStream<SubscribeRequest, SubscribeUpdate>;
  private onTransactionCallback?: OnTransactionCallback;

  constructor(
    url: string,
    private readonly filters: SubscribeOptions,
    token?: string
  ) {
    const fullUrl = url.startsWith("http") ? url : `http://${url}`;
    this.client = new Client(fullUrl, token, {});
  }

  public onTransaction(onTransactionCallback: OnTransactionCallback) {
    this.onTransactionCallback = onTransactionCallback;
  }

  public async start() {
    this.stream = await this.client.subscribe();
    const request = this.createRequest();
    await this.sendSubscribeRequest(this.stream, request);
    this.stream.on("data", (data: SubscribeUpdate) => {
      if (this.onTransactionCallback && data.transaction) {
        this.onTransactionCallback(data.transaction);
      }
    });
    return this.handleStreamEvents(this.stream).catch((error) =>
      console.log(error)
    );
  }

  public stop() {
    this.stream?.removeAllListeners();
    this.stream?.end();
  }

  private createRequest(): SubscribeRequest {
    return {
      accounts: {},
      blocks: {},
      blocksMeta: {},
      entry: {},
      slots: {},
      transactionsStatus: {},
      accountsDataSlice: [],
      transactions: {
        [this.filters.filterName || 'default-filter']: {
          accountInclude: this.filters.includeAccounts || [],
          accountExclude: this.filters.excludeAccounts || [],
          accountRequired: this.filters.requiredAccounts || [],
        },
      },
      commitment: CommitmentLevel.PROCESSED,
    };
  }

  private async sendSubscribeRequest(
    stream: ClientDuplexStream<SubscribeRequest, SubscribeUpdate>,
    request: SubscribeRequest
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const status = stream.write(request, (err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private async handleStreamEvents(
    stream: ClientDuplexStream<SubscribeRequest, SubscribeUpdate>
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      stream.on("error", (error: Error) => {
        console.error("Stream error:", error);
        reject(error);
        stream.end();
      });
      stream.on("end", () => {
        console.log("Stream ended");
        resolve();
      });
      stream.on("close", () => {
        console.log("Stream closed");
        resolve();
      });
    });
  }
}
