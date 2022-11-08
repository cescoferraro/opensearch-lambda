import pg from "pg"
import {AllowNull, AutoIncrement, Column, Default, Model, PrimaryKey, Sequelize, Table} from "sequelize-typescript";


@Table({
    schema: 'public',
    tableName: 'pokemon',
})
export class PokemonModel extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column
    public id?: number;

    @Column
    public name: string;

    @Column
    public type: string;

    @AllowNull
    @Column
    public imageUrl?: string;

    @Default(false)
    @Column
    public isFeatured: boolean;
}

export class Pokemon {
    public id?: number;
    public name: string;
    public type: string;
    public isFeatured: boolean;
    public imageUrl?: string;

    public constructor(data?: object | undefined) {
        if (data) {
            this.id = data['id'];
            this.imageUrl = data['imageUrl'];
            this.isFeatured = data['isFeatured'];
            this.type = data['type'];
            this.name = data['name'];
        }
    }
}

export interface PokemonRepository {
    count(): Promise<number>;
}

export class SequelizePokemonRepository implements PokemonRepository {
    async count(): Promise<number> {
        return await PokemonModel.count();
    }

}


export const hello = async (event) => {
    const {DATABASE_URL = ''} = process.env;

    const sequelize = new Sequelize(DATABASE_URL, {
        dialect: 'postgres',
        dialectModule: pg,
        define: {
            timestamps: true,
            freezeTableName: true,
        },
    });

    sequelize.addModels([PokemonModel]);

    const repository = new SequelizePokemonRepository();
    const totalCount = await repository.count()
    await sequelize.authenticate()
    return {
        statusCode: 200,
        body: JSON.stringify(
            {
                message: 'Some Message Here',
                input: {
                    ...event,
                    count: totalCount
                },
            },
            null,
            2
        ),
    };
};