export interface BaseRepository<T>{
    create(data:Omit<T,'id'>):Promise<T>;
    update(id:string,data:Omit<T,'id'>):Promise<Boolean>;
    delete(id:string):Promise<Boolean>;
    findById(id:string):Promise<T>;
    findAll():Promise<T[]>;
}