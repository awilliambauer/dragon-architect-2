import time
from flask import Flask, jsonify, request
import sqlite3
import json

app = Flask(__name__)

# db = SQLAlchemy()
# migrate = Migrate()
# ma = Marshmallow()
# cors = CORS()

# db.init_app(app)
# migrate.init_app(app, db)
# ma.init_app(app)
# cors.init_app(app)

@app.route('/time')
def get_current_time():
    return {'time': time.time()}

@app.route('/progress', methods=['GET', 'POST'])
def get_current_progress():
    con = sqlite3.connect('completions.db')
    cur = con.cursor()
    # user_info = request.get_json()
    # print("THISISUSERINFO: " + user_info)
    # cur.execute("INSERT INTO completions (id, completed_puzzles) VALUES (?, ?)", (0, "case 0"))
    # con.commit()
    
    cur.execute("SELECT * from completions")
    #print("REQUEST METHOD: " + request.method)

    if request.method == 'GET': # We want to get data from the table
        row = cur.fetchone()
        print("CURRENT ROW: ", row)
        return jsonify(
            progress = row[1]
        )

    if request.method == 'POST': # We want to "add" (post) to the table
        # Check if the local storage has an ID
        # If so, use that as the id variable
        #id = 12
        # If it's not in local storage, create a new one (Potentially using npm uuid)
        user_info = request.get_json()
        print(type(user_info["progress"]))
        #print("THIS IS THE USER_INFO: ", user_info)
        # print(completed_puzzles)
        # Add the puzzles_completed list into the data table
        #print(user_info["id"])
        # print()
        # print(user_info["progress"])
        # print()
        #cur.execute("INSERT INTO completions (id, completed_puzzles) VALUES (?, ?)", (2, json.dumps(user_info["progress"])))
        #, json.dumps(user_info["id"]
        cur.execute("UPDATE completions SET completed_puzzles = ? WHERE id = ?", (json.dumps(user_info["progress"]), json.dumps(user_info["id"])))

        con.commit()
        return "ok", 200

        # In readme, include the steps to create the data base (sqlite commands)
        # pip install -r requirements.txt
        # Create user IDs when they enter the game, if not already there (in local storage)
        # When the user opens DA, the new users' id is directly put into the completions table in a separate python function (the progress will be empty)
        # Use update command in SQL, the ID will always already be there

@app.route('/uuid', methods=['GET', 'POST'])
def add_uuid():
    if request.method == 'POST':
        con = sqlite3.connect('completions.db')
        cur = con.cursor()
        cur.execute("SELECT * from completions")

        uuid = request.get_json() # get the user's id
        cur.execute("INSERT INTO completions (id, completed_puzzles) VALUES (?, ?)", (json.dumps(uuid["user_id"]), "nothing"))
        con.commit()

        return "ok", 200

@app.route('/clear_table', methods=['POST'])
def clear_table():
    con = sqlite3.connect('completions.db')
    cur = con.cursor()
    cur.execute("SELECT * from completions")
    cur.execute("DELETE FROM completions")
    con.commit()
    return "ok", 200