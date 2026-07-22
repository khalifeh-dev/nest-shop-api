import { NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";




export const has = async (prisma: DatabaseService, model: string, id: string, message: string) => {
    const record = await prisma.replica[model].findUnique({ where: { id } })
    if (!record) throw new NotFoundException(message || `${ model } Not Found With ID ${ id } .`)
    return record
}

