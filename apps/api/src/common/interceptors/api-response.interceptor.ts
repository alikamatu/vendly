import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Prisma } from '@prisma/client';

export interface Response<T> {
  data: T;
  meta?: any;
}

@Injectable()
export class ApiResponseInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // Standardize the response structure
        const response = {
          data: this.serialize(data),
          meta: (data as any)?.meta || {},
        };

        // If data already has a meta field (e.g. from pagination), lift it up
        if (data && typeof data === 'object' && 'meta' in data && 'data' in data) {
          return {
            data: this.serialize((data as any).data),
            meta: (data as any).meta,
          };
        }

        return response;
      }),
    );
  }

  /**
   * Recursively serialize objects to handle BigInt and Decimal types
   */
  private serialize(obj: any): any {
    if (obj === null || obj === undefined) return obj;

    // Handle BigInt
    if (typeof obj === 'bigint') {
      return obj.toString();
    }

    // Handle Prisma Decimal
    if (obj instanceof Prisma.Decimal) {
      return obj.toNumber();
    }

    // Handle Dates
    if (obj instanceof Date) {
      return obj.toISOString();
    }

    // Handle Arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => this.serialize(item));
    }

    // Handle Objects
    if (typeof obj === 'object') {
      const serializedObj: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          serializedObj[key] = this.serialize(obj[key]);
        }
      }
      return serializedObj;
    }

    return obj;
  }
}
