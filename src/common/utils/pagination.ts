export class Pagination {
  static values(
    limit: number = 20,
    page: number = 1,
    minLimit: number = 1,
    maxLimit: number = 50,
  ) {
    const finalLimit = Math.min(Math.max(limit, minLimit), maxLimit);
    const skip = (page - 1) * finalLimit;

    return {
      finalLimit,
      skip,
    };
  }
}
