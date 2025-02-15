/* eslint-disable @typescript-eslint/naming-convention,camelcase */
import { HttpModule } from '@nestjs/common';
import { ContextIdFactory } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { config } from 'node-config-ts';

import { CONFIG } from '../../config/config.module';

import { TinkSearchResponseObject, TinkSearchResultObject, TinkTransactionResponseObject } from '../dto/search.objects';
import { tinkSearchResponseObjectMock } from '../dto/search.objects.mock';
import { TinkSearchQueryInput } from '../dto/search.input';
import { TinkTransactionService } from './tink-transaction.service';
import { TinkHttpService } from './tink-http.service';

describe('TinkSearchService', () => {
  let tinkTransactionService: TinkTransactionService;
  let tinkHttpService: TinkHttpService;

  beforeEach(async () => {
    // To mock scoped DI
    const contextId = ContextIdFactory.create();
    jest.spyOn(ContextIdFactory, 'getByRequest').mockImplementation(() => contextId);

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        TinkHttpService,
        TinkTransactionService,
        {
          provide: CONFIG,
          useValue: config,
        },
      ],
    }).compile();

    tinkTransactionService = await moduleRef.resolve<TinkTransactionService>(TinkTransactionService, contextId);
    tinkHttpService = await moduleRef.resolve<TinkHttpService>(TinkHttpService, contextId);
  });

  it('should be defined', () => {
    expect(tinkTransactionService).toBeDefined();
  });

  describe('getTransactions', () => {
    it('should return a transactons list', async () => {
      const itemPerPage: number = 1000;
      const spy = jest.spyOn(tinkHttpService, 'post').mockReturnValue(Promise.resolve(tinkSearchResponseObjectMock));

      const input: TinkSearchQueryInput = {
        accounts: ['12345678910'],
        offset: 0,
        limit: itemPerPage,
      };

      const transactions: TinkTransactionResponseObject[] = await tinkTransactionService.getTransactions(input);

      expect(spy).toHaveBeenCalledWith(`/api/v1/search`, input);
      expect(transactions).toEqual(
        tinkSearchResponseObjectMock.results.map((r: TinkSearchResultObject) => r.transaction),
      );
    });

    it('should return a transactons list of all pages', async () => {
      const totalTransactionsCount: number = 2050;
      const itemPerPage: number = 1000;
      const allTransactionResultsMock: TinkSearchResultObject[] = Array(totalTransactionsCount).fill(
        tinkSearchResponseObjectMock.results[0],
      );

      const spy = jest
        .spyOn(tinkHttpService, 'post')
        .mockImplementation(async (_: string, input: TinkSearchQueryInput) => {
          const transactionResultsPaginated: TinkSearchResultObject[] = allTransactionResultsMock.slice(
            input.offset,
            (input.offset ?? 0) + (input.limit ?? 0),
          );
          const searchResult: TinkSearchResponseObject = {
            count: transactionResultsPaginated.length,
            results: transactionResultsPaginated,
          };

          return Promise.resolve(searchResult);
        });

      const transactions: TinkTransactionResponseObject[] = await tinkTransactionService.getTransactions();

      expect(spy).toHaveBeenCalledTimes(Math.ceil(totalTransactionsCount / itemPerPage));
      expect(transactions.length).toEqual(totalTransactionsCount);
    });
  });
});
