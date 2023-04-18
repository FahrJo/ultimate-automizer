import * as http from 'http';
import * as https from 'https';
import * as url from 'url';

export interface HttpResponse {
    statusCode: number | undefined;
    headers: http.IncomingHttpHeaders;
    body: string;
}

export function httpsRequest(urlOptions: string | https.RequestOptions | url.URL, data: any = '') {
    let promise = new Promise<HttpResponse>((resolve, reject) => {
        // Inspired from https://gist.github.com/ktheory/df3440b01d4b9d3197180d5254d7fb65
        const req = https.request(urlOptions, (res) => {
            const chunks: any = [];

            res.on('data', (chunk) => chunks.push(chunk));
            res.on('error', reject);
            res.on('end', () => {
                const { statusCode, headers } = res;
                const validResponse = statusCode! >= 200 && statusCode! <= 299;
                const body = chunks.join('');

                if (validResponse) {
                    resolve({ statusCode, headers, body });
                } else {
                    reject(new Error(`Request failed. status: ${statusCode}, body: ${body}`));
                }
            });
        });

        req.on('error', reject);
        req.write(data, 'binary');
        req.end();
    });
    return promise;
}
