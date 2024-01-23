import { create_many, create_one, get_many, pull, query, transact, delete_one, get_one, update_one, aggregate, get_user_profile } from "./online-helpers/datascript";
import { put_one_entity, get_one_entity, update_one_entity, delete_one_entity, put_many_entities, get_many_entities, update_many_entities, delete_many_entities } from "./online-helpers/entity";
import { put_one_file, get_one_file, update_one_file, delete_one_file, put_many_files, get_many_files, update_many_files, delete_many_files, get_viewable_url_from_canonical_url } from "./online-helpers/file";
import { put_one_image, get_one_image, update_one_image, delete_one_image, put_many_images, get_many_images, update_many_images, delete_many_images } from "./online-helpers/image";


const online = {
    entity: {
        put_one: put_one_entity,
        get_one: get_one_entity,
        update_one: update_one_entity,
        delete_one: delete_one_entity,
        put_many: put_many_entities,
        get_many: get_many_entities,
        update_many: update_many_entities,
        delete_many: delete_many_entities
    },
    file: {
        put_one: put_one_file,
        get_one: get_one_file,
        update_one: update_one_file,
        delete_one: delete_one_file,
        put_many: put_many_files,
        get_many: get_many_files,
        update_many: update_many_files,
        delete_many: delete_many_files,
        get_valid_url: get_viewable_url_from_canonical_url
    },
    image: {
        put_one: put_one_image,
        get_one: get_one_image,
        update_one: update_one_image,
        delete_one: delete_one_image,
        put_many: put_many_images,
        get_many: get_many_images,
        update_many: update_many_images,
        delete_many: delete_many_images
    },
    datascript: {
        query,
        transact,
        pull,
        create_one,
        create_many,
        get_many,
        delete_one,
        get_one,
        update_one,
        aggregate,
        get_user_profile
    }
}

export default online;